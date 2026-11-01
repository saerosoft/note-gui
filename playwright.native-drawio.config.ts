import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const spki = process.env.NOTE_GUI_DRAWIO_SPKI;
if (!spki) throw new Error('Set NOTE_GUI_DRAWIO_SPKI to the isolated certificate public-key pin.');

export default defineConfig(base, {
  testMatch: 'nativeDrawio.independent.spec.ts', testIgnore: [],
  timeout: 120_000,
  outputDir: '.tmp/native-drawio-results',
  reporter: [['list'], ['json', { outputFile: '.tmp/native-drawio-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:18139/example/', launchOptions: { args: [`--ignore-certificate-errors-spki-list=${spki}`] } },
  webServer: [
    { command: 'node scripts/independent-host.mjs', url: 'http://127.0.0.1:18139/example/', reuseExistingServer: false },
    { command: 'node scripts/native-drawio-host.mjs', url: 'https://127.0.0.1:18143/', ignoreHTTPSErrors: true, reuseExistingServer: false },
  ],
});
