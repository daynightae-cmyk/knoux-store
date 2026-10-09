import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { providerFixture } from './fixtures/provider-os';
const widths = [[1904, 880], [1600, 1000], [1440, 900], [1366, 768], [1280, 800], [1024, 1366], [820, 1180], [768, 1024], [430, 932], [390, 844], [375, 812], [360, 800]] as const;
test.beforeEach(async ({ page }) => { await page.addInitScript(() => sessionStorage.setItem('knoux-dev-entry-intent', 'Provider operating system')); });
test('Provider OS HTTP boundary refuses anonymous and cross-site credential access without echoes', async ({ request }) => {
    const response = await request.get('/api/build/provider-os');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.persistence).toBe('AUTH_REQUIRED');
    expect(body.profiles).toEqual([]);
    expect(body.credentials).toEqual([]);
    expect(body.definitions.length).toBeGreaterThan(10);
    const value = 'TEST_ONLY_SENTINEL_WRITE_ONLY';
    for (const options of [{ data: { action: 'CREDENTIAL_CREATE', secret: value } }, { headers: { origin: 'https://evil.example' }, data: { action: 'CREDENTIAL_CREATE', secret: value } }]) {
        const result = await request.post('/api/build/provider-os', options);
        expect([401, 403]).toContain(result.status());
        expect(await result.text()).not.toContain(value);
    }
});
test('catalog, profile switching, disabling and write-only credential rotation have truthful UI contracts', async ({ page }) => {
    const fixture = await providerFixture(page);
    await page.goto('/build/providers');
    const registry = page.getByRole('navigation', { name: 'Provider registry' });
    await registry.getByRole('button', { name: /^Groq\b/ }).click();
    const tabs = page.getByRole('navigation', { name: 'Groq sections' });
    await tabs.getByRole('button', { name: 'Models', exact: true }).click();
    await expect(page.getByText('Embedding · CONTRACT FIXTURE', { exact: true })).toHaveCount(0);
    await page.getByLabel('SHOW ALL').check();
    await expect(page.getByText('Embedding · CONTRACT FIXTURE', { exact: true })).toBeVisible();
    await page.getByLabel('FREE only').check();
    await expect(page.getByText('Free · CONTRACT FIXTURE', { exact: true })).toBeVisible();
    await expect(page.getByText('Text · CONTRACT FIXTURE', { exact: true })).toHaveCount(0);
    await tabs.getByRole('button', { name: 'Profiles & Limits', exact: true }).click();
    await page.getByRole('button', { name: 'Use Company · CONTRACT FIXTURE', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use Company · CONTRACT FIXTURE', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Disable provider', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enable provider', exact: true })).toBeVisible();
    await tabs.getByRole('button', { name: 'Routing', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Routing', exact: true })).toContainText('PROVIDER_DISABLED');
    await tabs.getByRole('button', { name: 'Credentials', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete Shared · CONTRACT FIXTURE' })).toBeDisabled();
    await page.getByRole('button', { name: 'Rotate Shared · CONTRACT FIXTURE' }).click();
    const value = 'TEST_ONLY_SENTINEL_WRITE_ONLY';
    await page.getByLabel('Secret (write only)').fill(value);
    await page.getByRole('button', { name: 'Save replacement', exact: true }).click();
    await expect(page.getByLabel('Secret (write only)')).toHaveValue('');
    expect(fixture.requests.at(-1)?.secret).toBe(value);
    expect(await page.locator('body').innerText()).not.toContain(value);
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain(value);
    await tabs.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Overview', exact: true })).toContainText('UNTESTED');
});
test('connection wizard traps focus and billing acknowledgement is separate from connection testing', async ({ page }) => {
    await providerFixture(page);
    await page.goto('/build/providers');
    await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /^Groq\b/ }).click();
    const add = page.getByRole('button', { name: 'Add profile +' });
    await add.click();
    const dialog = page.getByRole('dialog', { name: 'Add Groq profile' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Profile name')).toBeFocused();
    await dialog.getByLabel('Profile name').fill('Third · CONTRACT FIXTURE');
    await dialog.getByLabel('Stored credential').selectOption('33333333-3333-4333-8333-333333333333');
    await dialog.getByRole('button', { name: 'Create profile', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(add).toBeFocused();
    await add.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(add).toBeFocused();
    await page.getByRole('navigation', { name: 'Groq sections' }).getByRole('button', { name: 'Diagnostics', exact: true }).click();
    const live = page.getByRole('button', { name: 'RUN LIVE GENERATION TEST' });
    await expect(live).toBeDisabled();
    await page.getByLabel(/I acknowledge/).check();
    await expect(live).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Test connection', exact: true })).toBeEnabled();
});
test('coding agent permissions, environment names and real inventory binding states remain separate', async ({ page }) => {
    await providerFixture(page);
    await page.goto('/build/providers');
    await page.getByRole('group', { name: 'Provider class' }).getByRole('button', { name: 'Coding agents', exact: true }).click();
    await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /Codex/ }).click();
    const tabs = page.getByRole('navigation', { name: 'Codex · CONTRACT FIXTURE sections' });
    await expect(page.getByRole('region', { name: 'Overview', exact: true })).toContainText('EXECUTOR_NOT_CONNECTED');
    await tabs.getByRole('button', { name: 'Permissions', exact: true }).click();
    await page.getByLabel(/^PUSH ·/).selectOption('ALLOW');
    await page.getByRole('button', { name: 'Save permission policy' }).click();
    await expect(page.getByRole('status')).toContainText('server-side ceiling');
    for (const tab of ['Environment', 'MCP', 'Plugins', 'Skills']) {
        await tabs.getByRole('button', { name: tab, exact: true }).click();
        await expect(page.getByRole('region', { name: tab, exact: true })).toBeVisible();
    }
    const audit = await new AxeBuilder({ page }).include('#main-content').analyze();
    expect(audit.violations).toEqual([]);
});
for (const width of [1440, 390])
    test(`provider refusal and navigation visual states at ${width}`, async ({ page }, info) => {
        test.skip(info.project.name !== 'desktop', 'Exact viewport is supplied here.');
        await page.setViewportSize({ width, height: 900 });
        const directory = path.resolve('references/provider-os/qa', `states-${width}`);
        await mkdir(directory, { recursive: true });
        const capture = async (name: string) => { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await page.screenshot({ path: path.join(directory, `${name}.png`) }); };
        await page.goto('/build/providers');
        await expect(page.getByRole('link', { name: 'Sign in ↗', exact: true })).toBeVisible();
        await capture('real-anonymous-auth-required');
        const fixture = await providerFixture(page);
        await page.getByRole('button', { name: 'Refresh facts ↗', exact: true }).click();
        await expect(page.getByLabel('Provider workspace')).toContainText('CONTRACT FIXTURE');
        await page.getByLabel('Search providers', { exact: true }).fill('Groq');
        await expect(page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button')).toHaveCount(1);
        await capture('fixture-search');
        await page.getByLabel('Search providers', { exact: true }).fill('');
        await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /^Groq\b/ }).click();
        for (const state of ['AUTH_REQUIRED', 'CONFIG_REQUIRED', 'RATE_LIMITED', 'BILLING_REQUIRED']) {
            fixture.data.profiles[0].connection.blocker = `${state} — CONTRACT FIXTURE visual state`;
            fixture.data.profiles[0].connection.health = 'BLOCKED';
            await page.getByRole('button', { name: 'Refresh facts ↗', exact: true }).click();
            await expect(page.getByRole('region', { name: 'Overview', exact: true })).toContainText(state);
            await capture(`fixture-${state.toLowerCase()}`);
        }
        const tabs = page.getByRole('navigation', { name: 'Groq sections' });
        await tabs.getByRole('button', { name: 'Models', exact: true }).click();
        await page.getByLabel('SHOW ALL').check();
        await capture('fixture-full-catalog');
        await page.getByLabel('FREE only').check();
        await capture('fixture-free-filter');
        await tabs.getByRole('button', { name: 'Usage', exact: true }).click();
        await capture('fixture-unknown-usage');
        await page.getByRole('group', { name: 'Provider class' }).getByRole('button', { name: 'Local', exact: true }).click();
        await capture('fixture-local-class');
        await page.getByRole('group', { name: 'Provider class' }).getByRole('button', { name: 'Coding agents', exact: true }).click();
        fixture.data.agents[0].detected = false;
        fixture.data.agents[0].state = 'CLI_NOT_FOUND';
        await page.getByRole('button', { name: 'Refresh facts ↗', exact: true }).click();
        await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /Codex/ }).click();
        await expect(page.getByRole('region', { name: 'Overview', exact: true })).toContainText('CLI_NOT_FOUND');
        await capture('fixture-cli-not-found');
    });
for (const [width, height] of widths)
    test(`provider visual contract ${width}x${height}`, async ({ page }, info) => {
        test.skip(info.project.name !== 'desktop', 'This test supplies all twelve exact viewports.');
        test.setTimeout(120000);
        await page.setViewportSize({ width, height });
        await providerFixture(page);
        await page.goto('/build/providers');
        const directory = path.resolve('references/provider-os/qa', `${width}x${height}`);
        await mkdir(directory, { recursive: true });
        const shots: string[] = [];
        const capture = async (state: string) => { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); const file = path.join(directory, `${state}.png`); await page.screenshot({ path: file }); shots.push(path.relative(process.cwd(), file).replaceAll('\\', '/')); };
        await expect(page.getByLabel('Provider workspace')).toContainText('CONTRACT FIXTURE');
        await capture('center');
        if (width <= 650) {
            await capture('mobile-provider-drawer');
            await page.getByText('Browse providers ↗', { exact: true }).click();
            await expect(page.getByRole('navigation', { name: 'Provider registry' })).not.toBeVisible();
            await capture('mobile-drawer-collapsed');
            await page.getByText('Browse providers ↗', { exact: true }).click();
        }
        await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /^Groq\b/ }).click();
        await capture('overview');
        const tabs = page.getByRole('navigation', { name: 'Groq sections' });
        for (const tab of ['Profiles & Limits', 'Credentials', 'Models', 'Capabilities', 'Routing', 'Usage', 'Diagnostics']) {
            await tabs.getByRole('button', { name: tab, exact: true }).click();
            await capture(tab.toLowerCase().replaceAll(' ', '-'));
        }
        await page.getByRole('button', { name: 'Add profile +' }).click();
        await capture('connection-wizard');
        await page.keyboard.press('Escape');
        await page.getByRole('group', { name: 'Provider class' }).getByRole('button', { name: 'Coding agents', exact: true }).click();
        await page.getByRole('navigation', { name: 'Provider registry' }).getByRole('button', { name: /Codex/ }).click();
        const agentTabs = page.getByRole('navigation', { name: 'Codex · CONTRACT FIXTURE sections' });
        for (const tab of ['CLI & Args', 'Environment', 'Permissions', 'MCP', 'Plugins', 'Skills']) {
            await agentTabs.getByRole('button', { name: tab, exact: true }).click();
            await capture(tab.toLowerCase().replaceAll(' ', '-'));
        }
        expect(await page.locator('#main-content').evaluate(element => element.querySelectorAll('canvas').length)).toBe(0); // Reuses the application-wide star canvas.
        await writeFile(path.join(directory, 'evidence.json'), JSON.stringify({ kind: 'EXPLICIT CONTRACT FIXTURE — UI only, no live provider proof', viewport: { width, height }, screenshots: shots, noHorizontalOverflow: true }, null, 2));
    });
