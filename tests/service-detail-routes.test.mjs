import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { root } from "./helpers.mjs";

const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const source = read("src", "data", "services.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const services = {};
runInNewContext(compiled, { exports: services });

test("every verified service has a unique canonical route and lookup", () => {
  assert.equal(services.webSystems.length, 6);
  assert.equal(services.creativeDisciplines.length, 8);
  for (const [division, entries, lookup, entities] of [
    ["web", services.webSystems, services.findWebSystem, services.webEntities],
    [
      "creative",
      services.creativeDisciplines,
      services.findCreativeDiscipline,
      services.creativeEntities,
    ],
  ]) {
    assert.equal(
      new Set(entries.map((entry) => entry.slug)).size,
      entries.length,
    );
    const routes = entities().map((entity) => entity.route);
    for (const entry of entries) {
      assert.equal(lookup(entry.slug), entry);
      assert.ok(routes.includes(`/${division}/${entry.slug}`));
      assert.ok(entry.statement && entry.capabilityIds.length);
    }
    assert.equal(lookup("not-a-service"), undefined);
    assert.ok(
      existsSync(join(root, "src", "app", division, "[slug]", "page.tsx")),
    );
  }
});

test("detail route metadata and static params derive from the registries", () => {
  for (const [division, collection, lookup] of [
    ["web", "webSystems", "findWebSystem"],
    ["creative", "creativeDisciplines", "findCreativeDiscipline"],
  ]) {
    const page = read("src", "app", division, "[slug]", "page.tsx");
    assert.ok(page.includes(`${collection}.map(({ slug }) => ({ slug }))`));
    assert.ok(page.includes(`${lookup}(slug)`));
    assert.ok(page.includes("if (!") && page.includes("notFound()"));
    assert.ok(page.includes("pageMetadata(") && page.includes("statement"));
    assert.ok(page.includes(`/${division}/\${`));
  }
});

test("discovery, sitemap and overviews point to canonical detail routes", () => {
  const sitemap = read("src", "app", "sitemap.ts");
  assert.match(
    sitemap,
    /webSystems\.map\(\(system\) => `\/web\/\$\{system\.slug\}`\)/,
  );
  assert.match(
    sitemap,
    /creativeDisciplines\.map\(\(discipline\) => `\/creative\/\$\{discipline\.slug\}`\)/,
  );
  const webOverview = read("src", "app", "web", "page.tsx");
  const creativeOverview = read("src", "app", "creative", "page.tsx");
  assert.ok(webOverview.includes("`/web/${system.slug}`"));
  assert.ok(creativeOverview.includes("`/creative/${discipline.slug}`"));
  for (const [path, text] of [
    ["services", source],
    ["web overview", webOverview],
    ["creative overview", creativeOverview],
    ["spatial", read("src", "components", "SpatialExperiences.tsx")],
    ["studio", read("src", "components", "WebSystems.tsx")],
  ]) {
    assert.doesNotMatch(
      text,
      /\/web\?system=|\/creative#|\/creative\?discipline=/,
      `${path} retains a legacy destination`,
    );
  }
});
