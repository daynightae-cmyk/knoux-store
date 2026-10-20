import { readFileSync } from 'node:fs';

const code = readFileSync(process.argv[2], 'utf8');
const lines = code.split('\n');
let depth = 0;
let minDepth = 0;
const issues = [];
let inBlockString = false;
let blockChar = '';
let lineIdx = 0;
let i = 0;

while (i < code.length) {
  const ch = code[i];
  const next = code[i + 1];

  // Line comments
  if (ch === '/' && next === '/') {
    const nl = code.indexOf('\n', i);
    if (nl === -1) break;
    i = nl;
    continue;
  }

  // Block comments
  if (ch === '/' && next === '*') {
    const nl = code.indexOf('*/', i + 2);
    if (nl === -1) {
      issues.push({ line: lineIdx + 1, kind: 'unclosed-block-comment' });
      break;
    }
    i = nl + 2;
    continue;
  }

  // Template literals (backtick) and regular strings
  if (ch === '`') {
    if (inBlockString && blockChar === '`') {
      inBlockString = false;
      blockChar = '';
    } else {
      inBlockString = true;
      blockChar = '`';
    }
    i++;
    continue;
  }
  if (inBlockString) {
    if (ch === '\\') { i += 2; continue; }
    if (ch === '`' && blockChar === '`') inBlockString = false;
    i++;
    continue;
  }
  if (ch === "'" || ch === '"') {
    const q = ch;
    if (inBlockString && blockChar === q) {
      inBlockString = false;
      blockChar = '';
    } else {
      inBlockString = true;
      blockChar = q;
    }
    i++;
    continue;
  }

  // Outside strings/comments: check braces and newlines
  if (ch === '{') { depth++; if (depth < minDepth) minDepth = depth; }
  if (ch === '}') {
    depth--;
    if (depth < 0) {
      issues.push({ line: lineIdx + 1, kind: 'extra-close' });
      depth = 0;
    }
  }
  if (ch === '\n') lineIdx++;
  i++;
}

console.log(`final_depth=${depth} min_depth=${minDepth} total_issues=${issues.length}`);
for (const issue of issues.slice(0, 15)) {
  console.log(`line ${issue.line}: ${issue.kind}`);
}
