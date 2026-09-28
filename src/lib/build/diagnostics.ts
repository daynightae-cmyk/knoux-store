/**
 * Diagnostic normalisation.
 *
 * Tool output is text with a tool-specific shape. This turns TypeScript, ESLint
 * and test-runner output into one `Diagnostic` type without inventing
 * precision: when a parser cannot find a line number it leaves the field null
 * rather than guessing zero.
 *
 * The `rootCause` field is the important one. It is only ever set by a caller
 * that has actually established causation. Everything this file produces sets
 * `evidence` instead, and a correlation stays a correlation.
 */

import type { Diagnostic, DiagnosticSeverity, DiagnosticSource } from './types';

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence.toString(36)}`;
}

/** Reset for deterministic tests. */
export function resetDiagnosticSequence(): void {
  sequence = 0;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

/** `src/app/page.tsx(12,5): error TS2345: ...` and the bare `file:line:col` form. */
const TS_LOCATION = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/;
const ESLINT_LOCATION = /^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s\s+(.+)$/;

export function parseTypeScript(output: string, source: DiagnosticSource = 'typescript'): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const line of stripAnsi(output).split('\n')) {
    const match = TS_LOCATION.exec(line);
    if (!match) continue;
    const [, file, row, column, severity, code, message] = match;
    out.push({
      id: nextId(`ts-${code}`),
      source,
      severity: severity as DiagnosticSeverity,
      title: `${code} in ${file}`,
      message: message.trim(),
      file,
      line: Number(row),
      column: Number(column),
      relatedFiles: [],
      evidence: line.trim(),
      status: 'fail',
      rootCause: null,
      verificationMethod: 'Re-run `npm run typecheck` and confirm exit code 0.',
    });
  }
  return out;
}

/**
 * ESLint's stylish output. The file name appears on its own line, so the parser
 * keeps the last one it saw. A line that does not match a diagnostic shape is
 * treated as a header only when it looks like a path, never as a finding.
 */
export function parseEslint(output: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  let currentFile: string | null = null;
  for (const line of stripAnsi(output).split('\n')) {
    if (!line.trim()) continue;
    if (!line.startsWith(' ') && /[\\/]/.test(line) && !/:\d+/.test(line)) {
      currentFile = line.trim();
      continue;
    }
    const match = ESLINT_LOCATION.exec(line);
    if (!match || !currentFile) continue;
    const [, row, column, severity, message, rule] = match;
    out.push({
      id: nextId(`eslint-${rule}`),
      source: 'eslint',
      severity: severity as DiagnosticSeverity,
      title: rule,
      message: message.trim(),
      file: currentFile,
      line: Number(row),
      column: Number(column),
      relatedFiles: [],
      evidence: line.trim(),
      status: 'fail',
      rootCause: null,
      verificationMethod: 'Re-run `npm run lint` and confirm the finding is gone.',
    });
  }
  return out;
}

/** The node test runner prints a failure block; keep it whole rather than guessing fields. */
export function parseTestRunner(output: string, exitCode: number): Diagnostic[] {
  const out: Diagnostic[] = [];
  if (exitCode === 0) return out;
  for (const line of stripAnsi(output).split('\n')) {
    const trimmed = line.trim();
    const notOk = /^not ok \d+ - (.+)$/.exec(trimmed);
    if (notOk) {
      out.push({
        id: nextId('test-fail'),
        source: 'test',
        severity: 'error',
        title: `Test failed: ${notOk[1]}`,
        message: notOk[1],
        file: null,
        line: null,
        column: null,
        relatedFiles: [],
        evidence: trimmed,
        status: 'fail',
        rootCause: null,
        verificationMethod: 'Re-run `npm test` and confirm the suite passes.',
      });
    }
  }
  return out;
}

export function summariseDiagnostics(diagnostics: Diagnostic[]): {
  errors: number;
  warnings: number;
  bySource: Record<DiagnosticSource, number>;
} {
  const bySource = {
    typescript: 0, eslint: 0, runtime: 0, browser: 0, test: 0, build: 0, security: 0, accessibility: 0,
  } as Record<DiagnosticSource, number>;
  let errors = 0;
  let warnings = 0;
  for (const diagnostic of diagnostics) {
    bySource[diagnostic.source] += 1;
    if (diagnostic.severity === 'error') errors += 1;
    if (diagnostic.severity === 'warning') warnings += 1;
  }
  return { errors, warnings, bySource };
}

/** A warning is not a failure. Only this predicate decides the aggregate. */
export function hasBlockingDiagnostic(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error' && diagnostic.status === 'fail');
}
