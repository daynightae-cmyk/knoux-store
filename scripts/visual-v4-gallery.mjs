import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const directory = resolve('references/visual-v4-verified');
const before = await Promise.all(['before', 'before-command-supplement'].map(async phase => {
  const report = JSON.parse(await readFile(join(directory, phase, 'capture-matrix.json'), 'utf8'));
  return report.records.map(record => ({ ...record, phase, head:report.head }));
}));
const after = JSON.parse(await readFile(join(directory, 'after', 'capture-matrix.json'), 'utf8'));
if(after.records.length !== 408) throw new Error('Expected complete 34-route, 12-viewport AFTER matrix');
const baseline = new Map(before.flat().map(record => [`${record.route}:${record.viewport.width}`,record]));
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows = after.records.map(record => {
  const prior = baseline.get(`${record.route}:${record.viewport.width}`);
  if(!prior) throw new Error('Missing corresponding BEFORE record');
  return { route:record.route, viewport:record.viewport, before:{head:prior.head,boxes:prior.boxed.length,tiny:prior.tiny.length,file:`${prior.phase}/${prior.file}`},
    after:{head:after.head,buildId:record.buildId,pid:record.owner.pid,port:record.owner.port,checkout:record.owner.checkout,
      startedAt:record.owner.startedAt,observedAt:record.owner.observedAt,status:record.status,cssIntegrity:record.cssIntegrity,
      css:record.css,finalRoute:record.finalRoute,boxes:record.boxed.length,tiny:record.tiny.length,overflow:record.overflow,
      consoleErrors:record.consoleErrors.length,pageErrors:record.pageErrors.length,failedResponses:record.failedResponses.length,
      authRefusals:record.authRefusals.length,unexpectedResponses:record.unexpectedResponses.length,unexpectedConsoleErrors:record.unexpectedConsoleErrors.length,
      starfieldCount:record.starfieldCount,file:`after/${record.file}`} };
});
const imagePath = file => {
  if(!/^(before|before-command-supplement|after)\/[a-z0-9-]+\.png$/.test(file)) throw new Error('Unexpected screenshot path');
  return file;
};
const figures = rows.filter(row=>[1440,390].includes(row.viewport.width)).map(row => `<section><h2>${escape(row.route)} · ${row.viewport.width}×${row.viewport.height}</h2><p>Full-border elements ${row.before.boxes} → ${row.after.boxes}; text below 12px ${row.before.tiny} → ${row.after.tiny}. HTTP ${row.after.status} / CSS ${row.after.cssIntegrity} / overflow ${row.after.overflow}.</p><div><figure><a href="${imagePath(row.before.file)}"><img loading="lazy" src="${imagePath(row.before.file)}" alt="${escape(row.route)} BEFORE"></a><figcaption>BEFORE ${escape(row.before.head)}</figcaption></figure><figure><a href="${imagePath(row.after.file)}"><img loading="lazy" src="${imagePath(row.after.file)}" alt="${escape(row.route)} AFTER"></a><figcaption>AFTER ${escape(row.after.head)}<small>build ${escape(row.after.buildId)} / PID ${row.after.pid} / port ${row.after.port}</small></figcaption></figure></div></section>`).join('\n');
await writeFile(join(directory,'comparison.json'),JSON.stringify({measuredAt:new Date().toISOString(),beforeRecords:before.flat().length,afterRecords:rows.length,head:after.head,buildId:after.buildId,records:rows},null,2)+'\n');
await writeFile(join(directory,'gallery.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>KNOuX V4 verified comparison</title><style>body{background:#08090a;color:#eee;font:16px system-ui;margin:32px}section{padding:32px 0;border-top:1px solid #444}section>div{display:grid;grid-template-columns:1fr 1fr;gap:24px}figure{margin:0;min-width:0}img{width:100%;height:540px;object-fit:contain;object-position:top;display:block}figcaption{line-height:1.7;overflow-wrap:anywhere}small{display:block;color:#aaa}@media(max-width:700px){section>div{grid-template-columns:1fr}}</style><h1>Visual V4 · verified comparison</h1><p>408 BEFORE / 408 AFTER records. Counts include functional buttons and table boundaries; fewer frames alone do not establish design quality. CSS byte checks and process ownership are recorded for every capture.</p>${figures}</html>`);
console.log(`Comparison generated for ${rows.length} corresponding records at ${after.head}`);
