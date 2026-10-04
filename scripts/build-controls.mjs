import ts from 'typescript';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = 'src/components/build/dev';
const files = readdirSync(base)
  .filter((name) => name.endsWith('.tsx') && name !== 'KnouxDevParticleHero.tsx')
  .map((name) => join(base, name).replaceAll('\\', '/'));
files.push('src/components/build/surfaces/PreviewSurface.tsx', 'src/components/build/workspace/Primitives.tsx');

const isBlockedByGuard = (value) => {
  if (!value) return false;
  const text = String(value).toLowerCase();
  return /require|requires|blocked|disabled|unavailable|unauthorized|locked|not configured|no .* key|not enabled/i.test(text);
};

const buildCapability = (file, label, tag, destination, handler, disabledValue) => {
  const source = `${file}\n${label}\n${tag}\n${destination ?? ''}\n${handler ?? ''}\n${disabledValue ?? ''}`.toLowerCase();
  if (source.includes('project') && source.includes('launch')) return 'project-launcher';
  if (source.includes('import')) return 'project-import';
  if (source.includes('verify') || source.includes('verification')) return 'build-verify';
  if (source.includes('preview')) return 'preview';
  if (source.includes('provider')) return 'providers';
  if (source.includes('tool')) return 'local-tools';
  if (source.includes('secret') || source.includes('vault')) return 'secrets';
  if (source.includes('setting') || source.includes('preferences')) return 'settings';
  if (source.includes('github')) return 'github';
  if (source.includes('switch')) return 'project-switching';
  if (source.includes('workspace')) return 'workspace';
  if (source.includes('palette')) return 'command-palette';
  if (source.includes('deploy')) return 'deployments';
  return 'generic-ui';
};

const buildAuthRequirement = (file, label, destination, handler, disabledValue) => {
  const source = `${file}\n${label}\n${destination ?? ''}\n${handler ?? ''}\n${disabledValue ?? ''}`.toLowerCase();
  if (source.includes('import') || source.includes('clone')) {
    return 'paired trusted bridge + projectImport capability + allowProjectImport=true';
  }
  if (source.includes('secret') || source.includes('vault')) {
    return 'encrypted writable vault required';
  }
  if (source.includes('github') && source.includes('private')) {
    return 'KNOUX_BUILD_GITHUB_TOKEN + operator authorization';
  }
  if (source.includes('preview') || source.includes('deploy')) {
    return 'proper Vercel API credentials + adapter';
  }
  if (source.includes('bridge') || source.includes('hosted')) {
    return 'authenticated gateway architecture required';
  }
  if (source.includes('provider') || source.includes('token')) {
    return 'provider credential + trusted adapter configuration required';
  }
  return 'none';
};

const buildDataSource = (file) => {
  if (file.includes('PreviewSurface') || file.includes('Primitives')) return 'source declaration + runtime preview surface';
  if (file.includes('Workspace') || file.includes('AppsPage') || file.includes('DevUI') || file.includes('BuildPipelinePage') || file.includes('ProjectLauncher')) {
    return 'source declaration + build state reducer / runtime route';
  }
  return 'source declaration';
};

const buildStatus = (disabledValue, hasHandler, hasDestination, label) => {
  if (disabledValue) {
    return /^(?:true|\{true\}|["']true["'])$/.test(disabledValue) ? 'blocked' : 'conditional';
  }
  if (hasHandler || hasDestination) {
    return 'enabled';
  }
  if (isBlockedByGuard(label)) {
    return 'blocked';
  }
  return 'unknown';
};

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

        const label = property('aria-label') ?? property('title') ?? parentText;
        const disabledValue = property('disabled') ?? property('aria-disabled') ?? null;
        const handler = property('onClick') ?? property('onChange') ?? property('onSubmit') ?? (tag === 'summary' ? 'native disclosure' : null);
        const destination = property('href') ?? null;
        const status = buildStatus(disabledValue, !!handler, !!destination, label);
        const blocked = status === 'blocked';
        const blocker = blocked
          ? (disabledValue ? `disabled by state guard: ${String(disabledValue).replace(/['"`]/g, '')}` : 'present in source but no valid enabled action metadata')
          : null;

        controls.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          tag,
          label,
          status,
          enabled: status === 'enabled',
          blocked,
          blocker,
          handler,
          destination,
          capability: buildCapability(file, label, tag, destination, handler, disabledValue),
          'data source': buildDataSource(file),
          'auth requirement': buildAuthRequirement(file, label, destination, handler, disabledValue),
          'verification evidence': blocked ? 'state guard / disabled expression present in source' : 'static source declaration; runtime state not evaluated',
          disabled: disabledValue,
          type: property('type'),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
mkdirSync('docs/build', { recursive: true });
writeFileSync('docs/build/BUILD_CONTROL_INVENTORY.json', JSON.stringify(controls, null, 2) + '\n');
console.log(`${controls.length} control declarations inventoried with source-truth status, blocker and auth metadata.`);
