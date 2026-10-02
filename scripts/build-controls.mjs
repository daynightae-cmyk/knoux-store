import ts from 'typescript';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const base = 'src/components/build/dev';
const files = readdirSync(base).filter((name) => name.endsWith('.tsx') && name !== 'KnouxDevParticleHero.tsx').map((name) => join(base, name).replaceAll('\\', '/'));
files.push('src/components/build/surfaces/PreviewSurface.tsx', 'src/components/build/workspace/Primitives.tsx');
const controls = [];
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (['button', 'input', 'select', 'textarea', 'Link', 'a', 'summary'].includes(tag)) {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const property = (name) => attributes.find((a) => a.name.getText(source) === name)?.initializer?.getText(source) ?? null;
        const parentText = node.parent.getText(source).replace(/\s+/g, ' ').slice(0, 180);
        controls.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, tag, label: property('aria-label') ?? property('title') ?? parentText, handler: property('onClick') ?? property('onChange') ?? (tag === 'summary' ? 'native disclosure' : null), destination: property('href'), disabled: property('disabled'), type: property('type') });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
mkdirSync('docs/build', { recursive: true });
writeFileSync('docs/build/BUILD_CONTROL_INVENTORY.json', JSON.stringify(controls, null, 2) + '\n');
console.log(`${controls.length} control declarations inventoried. Dynamic registry entries are represented by their source declaration.`);
