import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testMatch: ['independent.spec.ts', 'tree.independent.spec.ts', 'context.independent.spec.ts', 'nativeEditor.independent.spec.ts', 'dirty.independent.spec.ts', 'collaboration.independent.spec.ts'], testIgnore: [],
  outputDir: '.tmp/independent-results',
  reporter: [['list'], ['json', { outputFile: '.tmp/independent-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:18139/example/' },
  webServer: { command: 'node scripts/independent-host.mjs', url: 'http://127.0.0.1:18139/example/', reuseExistingServer: false },
});
