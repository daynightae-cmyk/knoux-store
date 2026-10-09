/**
 * Builds the V4 before/after comparison gallery from the two capture runs.
 *
 * Reads `references/visual-v4/{before,after}/capture-matrix.json` and emits a
 * single self-contained `index.html`. A family/viewport with no `after` record
 * is rendered as missing rather than silently dropped, so the gallery cannot
 * imply coverage it does not have.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'references', 'visual-v4');

const readMatrix = async (phase) => {
  try {
    return JSON.parse(await readFile(join(root, phase, 'capture-matrix.json'), 'utf8'));
  } catch {
    return null;
  }
};

const before = await readMatrix('before');
const after = await readMatrix('after');

if (!before) {
  process.stdout.write('no BEFORE capture found; nothing to compare\n');
  process.exit(1);
}

const key = (r) => `${r.family}::${r.viewport}`;
const afterByKey = new Map((after ?? []).map((r) => [key(r), r]));
const beforeByKey = new Map(before.map((r) => [key(r), r]));

const families = [...new Set(before.map((r) => r.family))];
const viewports = [...new Set(before.map((r) => r.viewport))];

/** Representative widths for the gallery: desktop, tablet, mobile. */
const showcase = new Set(['1440x900', '820x1180', '390x844']);

const rows = [];
for (const family of families) {
  const cells = [];
  for (const viewport of viewports) {
    const b = beforeByKey.get(`${family}::${viewport}`);
    if (!b) continue;
    const a = afterByKey.get(`${family}::${viewport}`);
    if (!showcase.has(viewport)) continue;

    const regression =
      !a ? 'NO AFTER' : a.status >= 400 ? 'STATUS FAIL' : a.overflow > 0 ? 'OVERFLOW' : 'OK';

    const figure = (record, label, phase) =>
      record
        ? `<figure>
             <figcaption>${label}</figcaption>
             <img loading="lazy" src="${phase}/${record.file}" alt="${family} ${record.viewport} ${label}">
             <p class="meta">status ${record.status} · overflow ${record.overflow}px · h ${record.docHeight}px · console errors ${record.consoleErrorCount}</p>
           </figure>`
        : `<figure class="missing"><figcaption>${label}</figcaption><p class="meta">not captured</p></figure>`;

    cells.push(`
      <section class="pair" data-regression="${regression}">
        <h3>${family} <span class="vp">${viewport}</span> <span class="flag ${regression === 'OK' ? 'ok' : 'bad'}">${regression}</span></h3>
        <div class="frames">
          ${figure(b, 'BEFORE', 'before')}
          ${figure(a, 'AFTER', 'after')}
        </div>
      </section>`);
  }
  if (cells.length) rows.push(`<article class="family"><h2>${family}</h2>${cells.join('')}</article>`);
}

const summarise = (records) => {
  if (!records) return { total: 0, failures: 0, overflow: 0, missingAfter: 0 };
  const matched = records.filter((r) => afterByKey.has(key(r)));
  return {
    total: records.length,
    captured: matched.length,
    failures: matched.filter((r) => afterByKey.get(key(r)).status >= 400).length,
    overflow: matched.filter((r) => afterByKey.get(key(r)).overflow > 0).length,
  };
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>KNOuX Visual System V4 — before / after</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#08090a; color:#f1eee8;
         font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  header { padding:32px 28px 20px; border-bottom:1px solid #292a2d; }
  h1 { margin:0 0 6px; font-size:26px; letter-spacing:-.02em; }
  h2 { margin:36px 0 12px; font-size:17px; letter-spacing:.14em; text-transform:uppercase;
       color:#b8b5b4; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  h3 { margin:18px 0 10px; font-size:13px; font-family:ui-monospace,Menlo,monospace;
       letter-spacing:.1em; text-transform:uppercase; color:#9a9899; }
  .vp { color:#6f6d70; }
  .flag { margin-left:8px; padding:2px 7px; font-size:11px; letter-spacing:.06em; }
  .flag.ok { background:#12241a; color:#7fd39a; }
  .flag.bad { background:#2a1414; color:#e08b8b; }
  .frames { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:16px; }
  figure { margin:0; }
  figcaption { font-family:ui-monospace,Menlo,monospace; font-size:11px;
               letter-spacing:.12em; color:#6f6d70; margin-bottom:6px; }
  img { width:100%; height:auto; display:block; border:1px solid #1c1d20; background:#0b0c0e; }
  .meta { margin:6px 0 0; font-family:ui-monospace,Menlo,monospace; font-size:11px; color:#6f6d70; }
  .missing img { display:none; }
  .summary { display:flex; gap:26px; flex-wrap:wrap; margin-top:10px;
             font-family:ui-monospace,Menlo,monospace; font-size:12px; color:#9a9899; }
  .summary b { color:#f1eee8; }
  footer { padding:28px; border-top:1px solid #292a2d; color:#6f6d70;
           font-family:ui-monospace,Menlo,monospace; font-size:11px; }
</style></head>
<body>
<header>
  <h1>KNOuX Visual System V4 — before / after</h1>
  <p class="meta">Local production build · reduced motion · system Chrome · desktop / tablet / mobile</p>
  <div class="summary">
    <span>before captures <b>${before.length}</b></span>
    <span>after captures <b>${after ? after.length : 0}</b></span>
    <span>families <b>${families.length}</b></span>
    <span>viewports <b>${viewports.length}</b></span>
  </div>
</header>
${rows.join('\n')}
<footer>
  Generated by scripts/visual-v4-gallery.mjs. Every cell is a real capture;
  a family without an AFTER record is labelled rather than omitted.
</footer>
</body></html>`;

await writeFile(join(root, 'index.html'), html, 'utf8');

const s = summarise(after ?? null);
process.stdout.write(`wrote references/visual-v4/index.html\n`);
process.stdout.write(`families: ${families.length}, showcase viewports: ${[...showcase].length}\n`);
process.stdout.write(`after: ${s.captured ?? 0} matched, ${s.failures ?? 0} status failures, ${s.overflow ?? 0} overflow\n`);