import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

// Explicitly targets the parent-owned isolated build preview. The normal CI
// config still starts its own server and refuses an occupied port.
export default defineConfig({
  ...base,
  testDir: '../e2e',
  outputDir: '../e2e/.artifacts-owner',
  webServer: undefined,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3351' },
});
