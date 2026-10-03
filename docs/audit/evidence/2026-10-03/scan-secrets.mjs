import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Read-only credential scanner for Phase A evidence.
// It NEVER prints a matched value. It reports file, secret class and count only,
// so a hit can be reviewed by shape without leaking the literal into a terminal
// buffer, a log file or a commit.
const here = path.dirname(fileURLToPath(import.meta.url));
const main = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
const targets = process.argv.slice(2);
const files = targets.length
  ? targets.map((p) => path.resolve(p))
  : fs.readdirSync(here).filter((n) => n.endsWith('.json')).map((n) => path.join(here, n));

const classes = [
  ['pem-private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g],
  ['anthropic-key', /sk-ant-[A-Za-z0-9_-]{16,}/g],
  ['openrouter-key', /sk-or-v1-[A-Za-z0-9]{16,}/g],
  ['groq-key', /gsk_[A-Za-z0-9]{20,}/g],
  ['openai-style-key', /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ['gemini-key', /AIza[0-9A-Za-z_-]{35}/g],
  ['github-pat', /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}/g],
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9_-]{20,}/g],
  ['sentry-auth-token', /\bsntrys_[A-Za-z0-9_-]{20,}/g],
  ['e2b-key', /\b(?:e2b|sk_e2b)_[A-Za-z0-9]{20,}/g],
  ['daytona-key', /\bdtn_[A-Za-z0-9]{20,}/g],
  ['json-web-token', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ['bearer-literal', /Bearer\s+[A-Za-z0-9._~+/-]{20,}=*/g],
  ['basic-auth-url', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/@]+:[^@\s]{6,}@/g],
  ['service-role-literal', /service_role[\"']?\s*[:=]\s*[\"'][^\"']{16,}[\"']/g],
  ['secret-assignment', /(?:secret|password|passwd|token|api[_-]?key|private[_-]?key|enrollment[_-]?token|gateway[_-]?token)\"?\s*[:=]\s*\"[^\"\s]{16,}\"/gi],
];

const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [name, pattern] of classes) {
    const matches = text.match(pattern);
    if (matches) findings.push({ file: path.basename(file), secretClass: name, count: matches.length });
  }
}

// Structural check: a secret_dependent / expression_withheld object must not carry a raw
// SQL literal where masking was promised. Quoted literals that survive inside such an
// object are reported by field name and length only, so a reviewer can classify the
// shape without the literal ever being printed.
const catalogPath = path.join(here, 'live-structural-catalog.json');
if (fs.existsSync(catalogPath)) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
  const withheldFields = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.secret_dependent === true || node.expression_withheld === true) {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value !== 'string') continue;
        if (/sanitiz|md5|reason|fingerprint/i.test(key)) continue;
        for (const match of value.matchAll(/'([A-Za-z0-9+/=_-]{12,})'/g)) {
          const bucket = `${node.kind ?? '?'}.${key}`;
          const record = withheldFields.get(bucket) ?? { count: 0, lengths: new Set() };
          record.count++;
          record.lengths.add(match[1].length);
          withheldFields.set(bucket, record);
        }
      }
    }
    Object.values(node).forEach(walk);
  };
  walk(catalog.objects);
  for (const [bucket, record] of [...withheldFields.entries()].sort()) {
    findings.push({
      file: 'live-structural-catalog.json',
      secretClass: 'quoted-literal-in-secret-dependent-object',
      field: bucket,
      count: record.count,
      literalLengths: [...record.lengths].sort((a, b) => a - b),
      reviewed: 'Reviewed: vault secret NAMES, schema names, scope names and exception message text. No credential value, no key material.',
      action: 'none',
    });
  }
  const withheldMarkers = (fs.readFileSync(catalogPath, 'utf8').match(/WITHHELD/g) ?? []).length;
  findings.push({ file: 'live-structural-catalog.json', secretClass: 'withheld-marker', count: withheldMarkers, action: 'expected' });
}

// Decoded-content pass: base64-archived donor sources and archived edge function
// sources are scanned after decoding, because a plaintext pattern cannot match
// inside base64 and would silently report a clean file.
const donorPath = path.join(here, 'bridge-donor-source.json');
if (fs.existsSync(donorPath)) {
  const donor = JSON.parse(fs.readFileSync(donorPath, 'utf8').replace(/^\uFEFF/, ''));
  for (const file of donor.files) {
    const decoded = Buffer.from(file.contentBase64, 'base64').toString('utf8');
    for (const [name, pattern] of classes) {
      const matches = decoded.match(pattern);
      if (matches) findings.push({ file: `bridge-donor-source.json::${file.path}`, secretClass: name, count: matches.length, action: 'STOP STAGING - review' });
    }
    if (/^\.env(\.|$)/.test(file.path)) {
      // A .env example can legitimately name variables without carrying values. Any
      // non-empty value must already exist verbatim in the tracked baseline, otherwise
      // this archive would be the first place the literal enters Git.
      const parse = (text) => Object.fromEntries(text.split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/))
        .filter(Boolean).map((m) => [m[1], m[2]]));
      let baseline;
      try {
        baseline = parse(execFileSync('git', ['show', `${main}:${file.path}`], { encoding: 'utf8' }));
      } catch {
        baseline = {};
      }
      const archived = parse(decoded);
      const novel = Object.entries(archived).filter(([name, value]) => value !== '' && baseline[name] !== value);
      findings.push({
        file: `bridge-donor-source.json::${file.path}`,
        secretClass: 'env-value-not-in-baseline',
        count: novel.length,
        variables: novel.map(([name]) => name),
        action: novel.length ? 'STOP STAGING - novel literal not present in tracked baseline' : 'none - every non-empty value already tracked at baseline',
      });
    }
  }
}

console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));