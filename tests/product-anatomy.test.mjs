import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { root } from './helpers.mjs';

function load(relativePath, dependencies = {}) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  const require = (specifier) => {
    if (specifier in dependencies) return dependencies[specifier];
    throw new Error(`Unexpected dependency: ${specifier}`);
  };
  new Function('require', 'module', 'exports', output)(require, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const software = load('src/data/software.ts');
const data = load('src/data/product-anatomy-data.ts', { '@/data/software': software });
const layout = load('src/data/product-anatomy-layout.ts');

test('every canonical product has sourced anatomy with only verified related products', () => {
  assert.equal(software.softwareProducts.length, 7);
  for (const product of software.softwareProducts) {
    const nodes = data.deriveProductAnatomy(product);
    const edges = data.deriveProductAnatomyEdges(nodes);
    assert.ok(data.validateProductAnatomy(nodes).valid, product.slug);
    assert.ok(nodes.every((node) => node.productId === product.id && node.sourceRefs.length > 0));
    assert.equal(nodes.filter((node) => node.kind === 'core').length, 1);
    assert.deepEqual(nodes.filter((node) => node.kind === 'related').map((node) => node.sourceRefs[0]), product.relatedIds);
    for (const node of nodes.filter((item) => item.kind === 'related')) {
      const related = software.softwareProducts.find((item) => item.id === node.sourceRefs[0]);
      assert.equal(node.route, `/products/${related.slug}`);
      assert.equal(node.summary, related.statement);
    }
    for (const node of nodes.filter((item) => item.kind === 'capability')) {
      assert.ok(node.sourceRefs.every((ref) => product.capabilities.includes(ref)));
    }
    for (const node of nodes.filter((item) => item.kind === 'technology')) assert.ok(product.technologies.includes(node.sourceRefs[0]));
    for (const node of nodes.filter((item) => item.kind === 'boundary')) assert.ok(product.limitations.includes(node.sourceRefs[0]));
    assert.ok(edges.every((edge) => nodes.some((node) => node.id === edge.from) && nodes.some((node) => node.id === edge.to)));
  }
});

test('layout is deterministic for every product and motif', () => {
  const visuals = load('src/data/product-visuals.ts');
  for (const product of software.softwareProducts) {
    const nodes = data.deriveProductAnatomy(product);
    const edges = data.deriveProductAnatomyEdges(nodes);
    const motif = visuals.visualProfileFor(product.slug)?.motif;
    assert.ok(motif, product.slug);
    assert.deepEqual(layout.computeProductAnatomyLayout(nodes, edges, motif), layout.computeProductAnatomyLayout(nodes, edges, motif));
  }
  assert.throws(() => layout.computeProductAnatomyLayout([], [], 'unknown-motif'), /Unknown product anatomy motif/);
});

test('semantic topology contains no Math.random call', () => {
  for (const file of ['src/data/product-anatomy-data.ts', 'src/data/product-anatomy-layout.ts']) {
    assert.doesNotMatch(readFileSync(join(root, file), 'utf8'), /Math\.random\s*\(/);
  }
});
