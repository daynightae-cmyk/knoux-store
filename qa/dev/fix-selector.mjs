import fs from 'node:fs';
let c = fs.readFileSync(p, 'utf8');
fs.writeFileSync(p, c);
c = c.split(bad).join(good);
const n = c.split(bad).length - 1;
const good = '.providerList';
console.log('removed ' + n + ' corrupted occurrences');
