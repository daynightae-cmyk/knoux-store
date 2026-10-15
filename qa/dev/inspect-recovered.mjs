import fs from 'node:fs';
const p = 'qa/dev/traycer-integration-recovered-20261014-075202.mjs';
let c = fs.readFileSync(p, 'utf8');
console.log('LENGTH=' + c.length);
console.log('HAS_NG_TARGET=' + c.includes('[data-knoux-context="/build/providers"]'));
console.log('HAS_PROVIDERLIST=' + c.includes('.providerList'));
console.log('---LINE 115---');
const lines = c.split('\n');
console.log(JSON.stringify(lines[114], null, 2));
