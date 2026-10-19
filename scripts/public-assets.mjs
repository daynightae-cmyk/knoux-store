import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Public asset budget.
 *
 * `public/` is served as-is: whatever is in it reaches every visitor's browser
 * with no optimisation, no negotiation and no transform. A single oversized
 * image therefore costs its full size on every page that shows it, which is
 * how a 2.38 MB PNG ended up being the largest thing the site ships. This
 * script is the budget that refuses it: any file over 500 KB fails the run,
 * and the summary is written beside the stylesheet integrity record so a PR
 * can see the total it is adding.
 */
const LIMIT_BYTES = 500 * 1024;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const root = process.cwd();
const publicDir = join(root, 'public');
const assets = await Promise.all(
  (await walk(publicDir)).map(async (file) => {
    const bytes = (await stat(file)).size;
    return { file: relative(root, file).split('\\').join('/'), bytes };
  }),
);
assets.sort((a, b) => b.bytes - a.bytes);

const offenders = assets.filter((asset) => asset.bytes > LIMIT_BYTES);
const summary = {
  limitBytes: LIMIT_BYTES,
  fileCount: assets.length,
  totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  largest: assets.slice(0, 10),
  offenders,
};

await mkdir(join(root, '.qa-assets'), { recursive: true });
await writeFile(join(root, '.qa-assets', 'assets.json'), JSON.stringify(summary, null, 2));

console.log(`public assets: ${summary.fileCount} files, ${(summary.totalBytes / 1024 / 1024).toFixed(2)} MB, limit ${(LIMIT_BYTES / 1024).toFixed(0)} KB per file`);
if (offenders.length) {
  for (const offender of offenders) {
    console.error(`OVER BUDGET: ${offender.file} is ${(offender.bytes / 1024).toFixed(1)} KB`);
  }
  process.exit(1);
}
