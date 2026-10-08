import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Growth migrations — static safety and consistency.
 *
 * The migrations are written and NOT applied. No local or dev Supabase was
 * available to execute them against: there is no Docker, no psql, no
 * SUPABASE_DB_URL, and the configured project ref is a REMOTE project. So the
 * status is MIGRATION_READY_NOT_APPLIED and the runtime gate — `supabase db
 * lint` against a real engine — has not run.
 *
 * What this file does instead is check the failure modes that a review cannot
 * see by eye, and that would otherwise only surface on a production apply:
 *
 *   1. Destructive statements. The brief forbids DROP TABLE, destructive column
 *      conversion, and production wipes. This asserts none is present, so a
 *      future edit cannot quietly introduce one.
 *   2. Referential consistency. A policy or grant on a table that was never
 *      created fails at apply time. This asserts every table named in a policy
 *      or a grant exists in a `create table`.
 *   3. Idempotency. Everything is `if not exists`, so re-running is safe.
 *   4. The safety constraints that encode application rules actually exist.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const growthFiles = files.filter((name) => name.startsWith('20261005'));
const growthSql = growthFiles.map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8') }));

const ALL = growthSql.map((entry) => entry.sql).join('\n');

/* --------------------------------------------------------- preconditions */

test('both Phase 2 Growth migrations exist and are named by the repo convention', () => {
  assert.equal(growthFiles.length, 2, 'expected exactly two Growth migrations');
  for (const name of growthFiles) {
    assert.match(
      name,
      /^20\d{12}_knoux_growth_v\d\.sql$/,
      `${name} must use the repo's <timestamp>_knoux_<feature>.sql convention`,
    );
  }
});

test('Growth migrations are ordered so v1 precedes v2', () => {
  const [first, second] = growthFiles;
  assert.ok(first.endsWith('_v1.sql'), 'the earlier migration must be v1');
  assert.ok(second.endsWith('_v2.sql'), 'the later migration must be v2');
  assert.ok(first < second, 'timestamp ordering must match the version ordering');
});

/* --------------------------------------------------------- destructiveness */

test('no destructive statement is present', () => {
  // Case-insensitive, and anchored so a comment mentioning "drop" cannot trip it.
  const forbidden = [
    [/\bdrop\s+table\b/i, 'DROP TABLE'],
    [/\bdrop\s+schema\b/i, 'DROP SCHEMA'],
    [/\btruncate\b/i, 'TRUNCATE'],
    [/\bdelete\s+from\b/i, 'DELETE FROM'],
    [/\bdrop\s+column\b/i, 'DROP COLUMN'],
    [/\bdrop\s+constraint\b/i, 'DROP CONSTRAINT'],
    [/\bupdate\s+\w+\s+set\b/i, 'UPDATE ... SET'],
  ];
  for (const [pattern, label] of forbidden) {
    // Strip comments so prose does not produce a false failure.
    const withoutComments = ALL.replace(/--[^\n]*/g, '');
    assert.equal(pattern.test(withoutComments), false, `${label} must not appear in a Growth migration`);
  }
});

test('no existing table is altered into a new type', () => {
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const alters = withoutComments.match(/alter\s+table\s+[\w.]+\s+alter\s+column/gi) ?? [];
  assert.equal(alters.length, 0, 'alter column is a conversion risk; use add column instead');
});

test('every additive column uses ADD COLUMN IF NOT EXISTS', () => {
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  // Each `add column` is inspected individually with its following text, rather
  // than via a multi-clause regex whose failure would be ambiguous to read.
  const occurrences = [...withoutComments.matchAll(/add\s+column\s*([^\n;]*)/gi)];
  for (const [, tail] of occurrences) {
    assert.match(
      tail.trim(),
      /^if\s+not\s+exists\b/i,
      `ADD COLUMN must be guarded: found "add column ${tail.trim().slice(0, 40)}"`,
    );
  }
  assert.ok(occurrences.length > 0, 'the migrations are expected to add at least one column');
});

/* ------------------------------------------------------------- idempotency */

test('every create table is guarded', () => {
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const creates = withoutComments.match(/create\s+table(?!s?\s+if\s+not\s+exists)/gi) ?? [];
  assert.equal(creates.length, 0, `unconditional CREATE TABLE is not idempotent: ${creates.join(', ')}`);
});

test('every create index is guarded', () => {
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const creates = withoutComments.match(/create\s+(unique\s+)?index(?!s?\s+if\s+not\s+exists)/gi) ?? [];
  assert.equal(creates.length, 0, `unconditional CREATE INDEX is not idempotent: ${creates.join(', ')}`);
});

/* --------------------------------------------------- referential integrity */

function createdTables(sql) {
  const withoutComments = sql.replace(/--[^\n]*/g, '');
  return new Set(
    [...withoutComments.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)].map(
      (match) => match[1],
    ),
  );
}

test('every policy targets a table that a migration creates', () => {
  const tables = createdTables(ALL);
  const withoutComments = ALL.replace(/--[^\n]*/g, '');

  const policyTargets = [
    ...withoutComments.matchAll(/create\s+policy\s+\w+\s+on\s+public\.(\w+)/gi),
  ].map((match) => match[1]);
  const alterTargets = [
    ...withoutComments.matchAll(/alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi),
  ].map((match) => match[1]);

  assert.ok(policyTargets.length > 0, 'the migrations must actually define policies');
  for (const table of [...policyTargets, ...alterTargets]) {
    assert.ok(tables.has(table), `policy/RLS on ${table}, which no migration creates`);
  }
});

test('every granted or revoked table exists', () => {
  const tables = createdTables(ALL);
  const withoutComments = ALL.replace(/--[^\n]*/g, '');

  const grantTargets = [
    ...withoutComments.matchAll(/(?:grant|revoke)[^;]*?\bon\s+table\s+public\.(\w+)/gi),
  ].map((match) => match[1]);

  assert.ok(grantTargets.length > 0, 'grants must be explicit, per the Signal migration precedent');
  for (const table of grantTargets) {
    assert.ok(tables.has(table), `grant on ${table}, which no migration creates`);
  }
});

test('every membership reference in a policy resolves to the memberships table', () => {
  // The tenancy boundary is expressed as a subquery on memberships. If that table
  // were renamed and a policy were missed, the boundary would fail closed (no
  // rows visible) which is safe, but silently so. This makes the rename visible.
  assert.ok(createdTables(ALL).has('knoux_growth_memberships'));
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const policySubqueries = withoutComments.match(/from\s+public\.knoux_growth_memberships/gi) ?? [];
  assert.ok(policySubqueries.length >= 10, 'the tenancy predicate should be used by every business table');
});

/* ------------------------------------------------------- safety constraints */

test('the schema encodes the safety rules the application enforces', () => {
  const names = [...ALL.matchAll(/constraint\s+(knoux_growth_\w+)/gi)].map((match) => match[1]);
  const set = new Set(names);

  // Each of these refuses something the application also refuses. If one were
  // removed, the database would accept a record the product would never allow.
  for (const required of [
    'knoux_growth_campaign_approvals_not_self_approved',
    'knoux_growth_campaigns_live_requires_provider',
    'knoux_growth_connections_verified',
    'knoux_growth_distribution_items_posted_has_actor',
    'knoux_growth_automation_rules_risk',
    'knoux_growth_automation_rules_action',
    'knoux_growth_metrics_live_has_evidence',
    'knoux_growth_communities_verified_has_time',
    'knoux_growth_content_published_requires_provider',
  ]) {
    assert.ok(set.has(required), `the schema must enforce ${required}`);
  }
});

test('the audit table has no update or delete path for the application role', () => {
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const auditBlock = withoutComments.slice(withoutComments.indexOf('knoux_growth_audit_log'));
  assert.equal(
    /create\s+policy\s+\w+\s+on\s+public\.knoux_growth_audit_log\s+for\s+(update|delete|all)/i.test(auditBlock),
    false,
    'the audit log must be select-only for authenticated users',
  );
  // And the grant must not include write verbs.
  const auditGrant = withoutComments.match(/grant\s+[^;]*knoux_growth_audit_log[^;]*;/i)?.[0] ?? '';
  assert.equal(/\b(insert|update|delete|all)\b/i.test(auditGrant), false, `audit grant must be read-only: ${auditGrant}`);
});

/* ------------------------------------------------------------- RLS coverage */

test('every created business table has RLS enabled', () => {
  const tables = createdTables(ALL);
  const withoutComments = ALL.replace(/--[^\n]*/g, '');
  const enabled = new Set(
    [...withoutComments.matchAll(/alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi)].map(
      (match) => match[1],
    ),
  );
  for (const table of tables) {
    assert.ok(enabled.has(table), `${table} has no RLS enabled`);
  }
});

test('anon is explicitly revoked from every Growth table', () => {
  const withoutComments = ALL.replace(/--[-\n]*/g, '');
  const revoked = new Set(
    [...withoutComments.matchAll(/revoke\s+all\s+on\s+table\s+public\.(\w+)\s+from\s+anon/gi)].map(
      (match) => match[1],
    ),
  );
  for (const table of createdTables(ALL)) {
    assert.ok(revoked.has(table), `${table} has no explicit anon revoke`);
  }
});

test('verification queries are documented in the migration', () => {
  // The brief asks for tests or SQL verification queries for the policies. The
  // queries are commented in the migration so they run against a real database
  // after apply; this asserts they are present and cover the key questions.
  assert.match(ALL, /relrowsecurity/);
  assert.match(ALL, /role_table_grants/);
  assert.match(ALL, /knoux_growth_campaign_approvals_not_self_approved/);
  assert.match(ALL, /pg_get_constraintdef/);
});

test('no credential-shaped column name exists in any Growth table', () => {
  // A column called access_token or client_secret would be a schema-level
  // invitation to store a credential in a row that a dump would expose.
  const forbidden = /(access_token|refresh_token|client_secret|app_secret|api_key|password|authorization)\b/i;
  const created = [...ALL.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.\w+\s*\(([\s\S]*?)\n\);/gi)];
  assert.ok(created.length > 0, 'must find create table blocks');
  for (const [, body] of created) {
    const columnNames = [...body.matchAll(/^\s{2}(\w+)\s+/gm)].map((match) => match[1]);
    for (const column of columnNames) {
      assert.equal(
        forbidden.test(column),
        false,
        `column "${column}" looks like a credential; store a secret reference instead`,
      );
    }
  }
  // The intended shape must be present: a reference column, not a value column.
  assert.match(ALL, /secret_ref\s+text/, 'connections should hold a secret reference');
});

/* ---------------------------------------------------------------------------
 * Regression tests for two defects found in review of this file's own output.
 *
 * Both passed the checks above, which is the point. Neither is visible to a
 * reader, and neither surfaces until a real Postgres executes the migration or
 * a real user calls the API. Static analysis is all that is available while the
 * migrations are unapplied, so the checks that would have caught them are
 * written here rather than left to `supabase db lint`.
 * ------------------------------------------------------------------------- */

/**
 * Columns declared by `alter table ... add column`, per table. These do NOT
 * exist at `create table` time.
 */
function columnsAddedLater(sql) {
  const added = new Map();
  for (const match of sql.matchAll(
    /alter\s+table\s+public\.(\w+)[\s\S]*?add\s+column\s+if\s+not\s+exists\s+(\w+)/gi,
  )) {
    if (!added.has(match[1])) added.set(match[1], new Set());
    added.get(match[1]).add(match[2]);
  }
  return added;
}

/** Column names declared inside a `create table if not exists public.<name> ( ... );` body. */
function columnsDeclaredInline(sql, table) {
  const pattern = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i',
  );
  const body = sql.match(pattern);
  if (!body) return null;
  return new Set([...body[1].matchAll(/^\s{2}(\w+)\s+\w/gm)].map((match) => match[1]));
}

test('no CHECK constraint references a column added by a later ALTER TABLE', () => {
  // Postgres evaluates a CHECK in CREATE TABLE against the columns declared so
  // far. Naming a column that an ALTER TABLE adds afterwards fails the whole
  // migration with `column "..." does not exist` — so the migration is not
  // "safe to apply", it does not apply at all.
  //
  // This shipped once: knoux_growth_campaigns_live_requires_provider named
  // provider_campaign_id, which was added by an ALTER TABLE after the CREATE.
  // knoux_growth_content_published_requires_provider had the same shape.
  for (const { name, sql } of growthSql) {
    const later = columnsAddedLater(sql);
    for (const [table, lateColumns] of later) {
      const declared = columnsDeclaredInline(sql, table);
      assert.ok(declared, `${name}: table ${table} has an ADD COLUMN but no CREATE TABLE`);
      for (const column of lateColumns) {
        assert.ok(
          declared.has(column),
          `${name}: ${table}.${column} is added by ALTER TABLE after CREATE TABLE, so any ` +
            `CHECK constraint naming it makes the migration fail at apply time. ` +
            `Declare it in the CREATE TABLE body instead.`,
        );
      }
    }
  }
});

test('the two provider-evidence constraints and their columns are consistent', () => {
  // Pairs that must agree: a CHECK that requires provider evidence, and the
  // column that evidence lives in. Asserted positively so removing either one
  // is a test failure rather than a silent loss of the guarantee.
  const pairs = [
    ['knoux_growth_campaigns', 'provider_campaign_id', 'knoux_growth_campaigns_live_requires_provider'],
    ['knoux_growth_content', 'provider_post_id', 'knoux_growth_content_published_requires_provider'],
  ];
  for (const [table, column, constraint] of pairs) {
    assert.match(ALL, new RegExp(`constraint\\s+${constraint}\\b`), `${constraint} is missing`);
    const declared = columnsDeclaredInline(ALL, table);
    assert.ok(declared, `${table} not found`);
    assert.ok(declared.has(column), `${table}.${column} is not declared in the CREATE TABLE body`);
  }
});

test('membership cannot be written by a user acting only for themselves', () => {
  // The escalation this prevents, end to end:
  //   insert into knoux_growth_memberships (user_id, client_id, role)
  //   values (auth.uid(), '<any client id>', 'OWNER');
  // A `for all` policy scoped only by `user_id = auth.uid()` allows exactly that,
  // because the with check is satisfied by the caller's own uid and nothing
  // constrains `role` or `client_id`. OWNER then satisfies
  // knoux_growth_clients_owner_write, and the workspace is the caller's.
  //
  // Every INSERT and UPDATE policy on memberships must gate on the ownership
  // helper instead.
  const sql = growthSql.find((entry) => entry.name.startsWith('20261005090000')).sql;
  const withoutComments = sql.replace(/--[-\n]*/g, '');

  const writePolicies = [...withoutComments.matchAll(
    /create\s+policy\s+(\w+)\s+on\s+public\.knoux_growth_memberships\s+for\s+(insert|update|all|\*)\s+to\s+\w+([\s\S]*?);/gi,
  )];

  assert.ok(writePolicies.length > 0, 'expected membership write policies to inspect');

  for (const [, policyName, command, rest] of writePolicies) {
    assert.notEqual(
      command.toLowerCase(),
      'all',
      `${policyName} is FOR ALL on memberships, which lets a user write their own row ` +
        `to any role. Split it into per-command policies.`,
    );
    assert.match(
      rest,
      /knoux_growth_is_client_owner/i,
      `${policyName} (${command}) does not gate on knoux_growth_is_client_owner, so a user ` +
        `can self-grant a role`,
    );
  }

  // The helper must exist and be SECURITY DEFINER, because a membership policy
  // that reads memberships is otherwise an infinite recursion error in Postgres.
  assert.match(withoutComments, /create\s+or\s+replace\s+function\s+public\.knoux_growth_is_client_owner/i);
  assert.match(withoutComments, /security\s+definer/i);
  assert.match(withoutComments, /set\s+search_path\s*=\s*public/i);
});

test('membership roles are grantable only by an existing owner', () => {
  // The complement of the previous test: reading your own row is necessary (the
  // tenant resolver looks up by user_id) but must be SELECT-only, and the only
  // way to obtain OWNER is to already hold it.
  const sql = growthSql.find((entry) => entry.name.startsWith('20261005090000')).sql;
  const withoutComments = sql.replace(/--[-\n]*/g, '');

  const readPolicies = [...withoutComments.matchAll(
    /create\s+policy\s+(\w+)\s+on\s+public\.knoux_growth_memberships\s+for\s+select\s+to\s+authenticated([\s\S]*?);/gi,
  )];
  assert.ok(readPolicies.length >= 1, 'expected a SELECT policy so a member can resolve their own role');

  for (const [, , rest] of readPolicies) {
    assert.match(rest, /user_id\s*=\s*auth\.uid\(\)/i, 'self read must be scoped to auth.uid()');
  }

  // A user may always remove their own membership; that is not an escalation.
  assert.match(withoutComments, /user_id\s*=\s*auth\.uid\(\)\s+or\s+public\.knoux_growth_is_client_owner/i);
});

test('the ownership helper is not executable by anon', () => {
  const withoutComments = ALL.replace(/--[-\n]*/g, '');
  assert.match(
    withoutComments,
    /revoke\s+all\s+on\s+function\s+public\.knoux_growth_is_client_owner\([^)]*\)\s+from\s+anon/i,
    'knoux_growth_is_client_owner must be revoked from anon',
  );
});

test('the bootstrap path for the first owner is documented, not self-service', () => {
  // Closing membership writes means the first owner cannot come from the API.
  // That is correct, and it has to be written down, because the alternative
  // "fix" an engineer reaches for is a self-grant policy — the exact escalation
  // the tests above refuse.
  assert.match(ALL, /Bootstrap/i, 'migration should document how the first owner is seeded');
  assert.match(ALL, /bypass(?:es)?\s+RLS/i);
  assert.match(ALL, /service_role/i);
});

test('verification queries cover the membership escalation and the helper', () => {
  assert.match(ALL, /pg_policy/);
  assert.match(ALL, /prosecdef/);
});
