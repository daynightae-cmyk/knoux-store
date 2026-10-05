import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'supabase');
const jsonOut = path.join(outDir, 'content-registry.generated.json');
const sqlOut = path.join(outDir, 'seed.generated.sql');
let sourceRevision = null;
try {
  // Metadata is optional. Use fixed installation locations rather than a
  // caller-controlled PATH when recording the generating source revision.
  const gitExecutable = process.platform === 'win32'
    ? 'C:/Program Files/Git/cmd/git.exe'
    : '/usr/bin/git';
  sourceRevision = execFileSync(gitExecutable, ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  sourceRevision = null;
}

const COLLECTIONS = [
  ['src/data/capabilities.ts', 'capabilities', 'capability'],
  ['src/data/composer-rules.ts', 'routeEntities', 'route'],
  ['src/data/composer-rules.ts', 'composerRules', 'composer_rule'],
  ['src/data/composer-rules.ts', 'composerPresets', 'composer_preset'],
  ['src/data/composer-rules.ts', 'composerDisclosure', 'composer_disclosure'],
  ['src/data/growth.ts', 'growthTargets', 'growth_target'],
  ['src/data/growth.ts', 'growthObjectives', 'growth_objective'],
  ['src/data/growth.ts', 'growthReaches', 'growth_reach'],
  ['src/data/growth.ts', 'growthModules', 'growth_module'],
  ['src/data/growth.ts', 'growthChannelsDetail', 'growth_channel'],
  ['src/data/growth.ts', 'budgetBands', 'budget_band'],
  ['src/data/navigation.ts', 'primaryNavigation', 'navigation_primary'],
  ['src/data/navigation.ts', 'institutionNavigation', 'navigation_institution'],
  ['src/data/navigation.ts', 'capabilityMatrixDivisions', 'capability_division'],
  ['src/data/product-visuals.ts', 'productVisualProfiles', 'product_visual'],
  ['src/data/services.ts', 'webSystemCategories', 'web_system_category'],
  ['src/data/services.ts', 'webSystems', 'web_system'],
  ['src/data/services.ts', 'creativeDisciplines', 'creative_discipline'],
  ['src/data/services.ts', 'engineeringStages', 'engineering_stage'],
  ['src/data/software.ts', 'softwareProducts', 'software_product'],
  ['src/data/software.ts', 'repositoryLedger', 'repository_record'],
  ['src/data/software.ts', 'labExperiments', 'lab_experiment'],
  ['src/data/solutions.ts', 'solutionGroups', 'solution_group'],
  ['src/data/solutions.ts', 'solutions', 'solution'],
  ['src/data/wordpress.ts', 'wordpressCategories', 'wordpress_category'],
  ['src/data/wordpress.ts', 'starterSiteVerticals', 'wordpress_vertical'],
  ['src/data/wordpress.ts', 'wordpressPillars', 'wordpress_pillar'],
  ['src/data/wordpress.ts', 'wordPressItems', 'wordpress_item'],
  ['src/data/wordpress.ts', 'wordPressServices', 'wordpress_service'],
  ['src/data/wordpress.ts', 'wordPressGoals', 'wordpress_goal'],
];

function unwrap(node) {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ||
         ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) {
    node = node.expression;
  }
  return node;
}
function literal(node) {
  node = unwrap(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    return -Number(literal(node.operand));
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        throw new Error(`Unsupported object member: ${prop.getText()}`);
      }
      const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : prop.name.getText();
      out[name] = literal(prop.initializer);
    }
    return out;
  }
  throw new Error(`Unsupported literal: ${node.getText()}`);
}

function exportedConst(filePath, exportName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    if (!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name) && decl.name.text === exportName && decl.initializer) {
        return literal(decl.initializer);
      }
    }
  }
  throw new Error(`Export ${exportName} not found in ${filePath}`);
}
function textArray(value) {
  return Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [];
}

function firstText(obj, names) {
  for (const name of names) {
    if (typeof obj?.[name] === 'string' && obj[name].trim()) return obj[name].trim();
  }
  return null;
}

function rowFor(item, entityType, sourceFile, index) {
  const object = item && typeof item === 'object' && !Array.isArray(item)
    ? item
    : { value: item };
  const sourceKey = firstText(object, ['id','slug','code','index']) ?? String(index + 1);
  const title = firstText(object, ['name','title','label','shortName','slug','id'])
    ?? (typeof item === 'string' ? item : `${entityType} ${index + 1}`);
  const searchTerms = [
    ...textArray(object.searchTerms),
    ...textArray(object.tags),
    ...textArray(object.categories),
    ...textArray(object.match),
  ];
  const relatedIds = [
    ...textArray(object.relatedEntityIds),
    ...textArray(object.relatedIds),
    ...textArray(object.relatedItems),
    ...textArray(object.entityIds),
    ...textArray(object.moduleIds),
    ...textArray(object.capabilityIds),
  ];
  const payload = object;
  const sourceHash = crypto.createHash('sha256')
    .update(JSON.stringify(payload)).digest('hex');
  return {
    id: `${entityType}:${sourceKey}`,
    entity_type: entityType,
    code: firstText(object, ['code','index']),
    slug: firstText(object, ['slug']),
    title,
    status: firstText(object, ['status']),
    route: firstText(object, ['route','liveUrl','demoUrl']),
    summary: firstText(object, ['statement','summary','tagline','intent','question','detail','note','reason','objective']),
    payload,
    search_terms: [...new Set(searchTerms)],
    related_ids: [...new Set(relatedIds)],
    sort_order: index,
    published: object.status !== 'archived',
    source_file: sourceFile.replaceAll('\\', '/'),
    source_hash: sourceHash,
  };
}

const rows = [];
for (const [relativeFile, exportName, entityType] of COLLECTIONS) {
  const filePath = path.join(root, relativeFile);
  const value = exportedConst(filePath, exportName);
  if (!Array.isArray(value)) throw new Error(`${exportName} must be an array`);
  value.forEach((item, index) => rows.push(rowFor(item, entityType, relativeFile, index)));
}

const settings = {
  software_audit_date: exportedConst(path.join(root, 'src/data/software.ts'), 'softwareAuditDate'),
  software_audit_owner: exportedConst(path.join(root, 'src/data/software.ts'), 'softwareAuditOwner'),
};
const sqlString = (value) => value == null
  ? 'null'
  : `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
const sqlArray = (value) => value.length === 0
  ? `'{}'::text[]`
  : `array[${value.map(sqlString).join(',')}]`;

const values = rows.map((r) => `(
  ${sqlString(r.id)}, ${sqlString(r.entity_type)}, ${sqlString(r.code)},
  ${sqlString(r.slug)}, ${sqlString(r.title)}, ${sqlString(r.status)},
  ${sqlString(r.route)}, ${sqlString(r.summary)}, ${sqlJson(r.payload)},
  ${sqlArray(r.search_terms)}, ${sqlArray(r.related_ids)}, ${r.sort_order},
  ${r.published ? 'true' : 'false'}, ${sqlString(r.source_file)}, ${sqlString(r.source_hash)}
)`);

const seed = `-- Generated by supabase/build-content-seed.mjs. Do not hand-edit.
begin;
insert into public.content_registry (
  id, entity_type, code, slug, title, status, route, summary, payload,
  search_terms, related_ids, sort_order, published, source_file, source_hash
) values
${values.join(',\n')}
on conflict (id) do update set
  entity_type = excluded.entity_type, code = excluded.code, slug = excluded.slug,
  title = excluded.title, status = excluded.status, route = excluded.route,
  summary = excluded.summary, payload = excluded.payload,
  search_terms = excluded.search_terms, related_ids = excluded.related_ids,
  sort_order = excluded.sort_order, published = excluded.published,
  source_file = excluded.source_file, source_hash = excluded.source_hash,
  updated_at = now();
`;
const settingsSql = Object.entries(settings).map(([key, value]) =>
  `insert into public.site_settings(key,value,is_public,description)
values (${sqlString(key)}, ${sqlJson(value)}, true, 'Repository evidence metadata')
on conflict (key) do update set value = excluded.value, updated_at = now();`
).join('\n');

const registryHash = crypto.createHash('sha256')
  .update(JSON.stringify(rows)).digest('hex');

const syncSql = `
insert into public.content_sync_runs(source_revision, source_hash, row_count, status, details, completed_at)
values (${sqlString(sourceRevision)}, ${sqlString(registryHash)}, ${rows.length}, 'completed',
  jsonb_build_object('generator','supabase/build-content-seed.mjs'), now());
commit;
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify({ generatedAt: new Date().toISOString(), registryHash, settings, rows }, null, 2));
fs.writeFileSync(sqlOut, seed + settingsSql + syncSql);

const counts = rows.reduce((acc, row) => {
  acc[row.entity_type] = (acc[row.entity_type] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ rowCount: rows.length, registryHash, counts, jsonOut, sqlOut }, null, 2));
