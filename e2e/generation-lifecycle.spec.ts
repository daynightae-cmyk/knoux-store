import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

test('fixture-backed cancel and revision contracts against the owned production server', async ({ baseURL }, info) => {
  test.skip(info.project.name !== 'desktop', 'The contract measures its own four exact viewport widths.');
  const result = await execute(process.execPath, ['--disable-warning=ExperimentalWarning', 'tests/generation-preview.browser.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, KNOUX_GENERATION_TEST_URL: baseURL },
    windowsHide: true,
    signal: AbortSignal.timeout(55_000),
  });
  for (const width of [1440, 820, 390, 360]) expect(result.stdout).toContain(`PASS explicit browser contract ${width}px`);
});
