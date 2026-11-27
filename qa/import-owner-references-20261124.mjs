import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const downloads = 'C:/Users/day night/Downloads';
const root = process.cwd();
const originals = path.join(root, 'references/owner-curation-20261124/originals');
const selectionPath = path.join(root, 'references/owner-curation-20261124/selection-manifest.json');
const expectedProviderHashes = {
  'knoux_provider_constellation_dashboard.png': '40f92e09b1f176c5a732b32e690d663262272f5f6747a1829af11b2b6a89ff38',
  'knoux_provider_intelligence_dashboard.png': 'c970c41d0b459147bc6f6947144f36dcabdb8ae81d7433020d0c91a4aa5d081d',
};

const supplementalKnouxNames = new Set([
  'KNOUX WordPress Studio_ Neon Arabic Workspace-1.png',
  'KNOUX WordPress Studio in Space-2.png',
  'KNOUX WordPress Studio_ Neon Cosmic UI-3.png',
  'KNOUX WordPress Studio in Cosmic UI-4.png',
  'KNOUX Neon WordPress Marketplace-5.png',
  'KNOUX Neon WordPress Marketplace-6.png',
  'KNOUX One Platform Command Hub-7.png',
  'KNOUX Build Neon AI Workspace-8.png',
  'KNOUX WordPress Studio Dashboard-9.png',
  'KNOUX WordPress Plugin Hub-10.png',
  'KNOUX Growth Arabic Campaign Dashboard-11.png',
  'KNOUX Growth Campaign Studio-12.png',
  'KNOUX Build Command Stage-13.png',
  'KNOUX Growth Campaign Studio-14.png',
  'KNOUX Build Cosmic AI Workspace-15.png',
  'KNOUX Cosmic Provider Router-16.png',
  'KNOUX Growth Client Studio Dashboard.png',
]);
const entries = await readdir(downloads, { withFileTypes: true });
const names = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).filter((name) => (
  supplementalKnouxNames.has(name)
  || /^ChatGPT Image Nov 23, 2026, 11_56_.+\.png$/.test(name)
  || name in expectedProviderHashes
));
if (names.length !== 29) throw new Error(`Expected 29 supplemental PNG originals, found ${names.length}`);

await mkdir(originals, { recursive: true });
const hashFile = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const dimensions = async (file) => {
  const data = await readFile(file);
  if (data.toString('ascii', 1, 4) !== 'PNG') throw new Error(`Not a PNG: ${file}`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
};
const atomicJson = async (file, value) => {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temp, file);
};

const imported = [];
for (const name of names.sort((a, b) => a.localeCompare(b))) {
  const source = path.join(downloads, name);
  const sha256 = await hashFile(source);
  if (name in expectedProviderHashes && sha256 !== expectedProviderHashes[name]) {
    throw new Error(`Provider reference SHA mismatch: ${name}`);
  }
  const destination = path.join(originals, name);
  let status = 'IMPORTED';
  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existingHash = await hashFile(destination);
    if (existingHash !== sha256) throw new Error(`Refusing to replace different existing original: ${name}`);
    status = 'VERIFIED_EXISTING';
  }
  const copiedHash = await hashFile(destination);
  if (copiedHash !== sha256) throw new Error(`Copied SHA mismatch: ${name}`);
  const size = (await readFile(destination)).byteLength;
  imported.push({
    source_filename: name,
    local_file: `references/owner-curation-20261124/originals/${name}`,
    sha256,
    bytes: size,
    ...(await dimensions(destination)),
    provenance: 'Owner-supplied original PNG from Windows Downloads; imported byte-for-byte',
    import_status: status,
  });
}

await atomicJson(path.join(originals, 'import-manifest.json'), {
  date: '2026-11-24',
  source: downloads,
  original_count: imported.length,
  policy: 'COPYFILE_EXCL; SHA-256 verified after copy; no existing unique file replaced',
  files: imported,
});

const selection = JSON.parse(await readFile(selectionPath, 'utf8'));
selection.attachment_bytes_on_windows = 'VERIFIED: 29 byte-for-byte PNG originals imported and SHA-256 recorded in originals/import-manifest.json';
selection.supplemental_original_count = imported.length;
selection.supplemental_import_manifest = 'references/owner-curation-20261124/originals/import-manifest.json';
selection.supplemental_originals = imported;
for (const [name, sha256, title, focus] of [
  ['knoux_provider_constellation_dashboard.png', expectedProviderHashes['knoux_provider_constellation_dashboard.png'], 'Provider Constellation', 'PRIMARY orbital provider selection with persistent center dossier'],
  ['knoux_provider_intelligence_dashboard.png', expectedProviderHashes['knoux_provider_intelligence_dashboard.png'], 'Provider Intelligence Catalog', 'PRIMARY searchable catalog credentials models updates and routing'],
]) {
  const existing = selection.screens.find((screen) => screen.chat_filename === name);
  const record = {
    chat_filename: name,
    title,
    route: '/build/providers',
    decision: 'PRIMARY',
    focus,
    source: 'Owner-supplied original PNG',
    windows_copy_status: 'VERIFIED',
    local_file: `references/owner-curation-20261124/originals/${name}`,
    sha256,
  };
  if (existing) Object.assign(existing, record);
  else selection.screens.push(record);
}
await atomicJson(selectionPath, selection);
console.log(JSON.stringify({ imported: imported.filter((file) => file.import_status === 'IMPORTED').length, existing: imported.filter((file) => file.import_status === 'VERIFIED_EXISTING').length, total: imported.length, providersVerified: true }, null, 2));
