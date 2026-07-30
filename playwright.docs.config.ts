import { defineConfig } from '@playwright/test';

const frontendUrl =
  process.env.DOCS_FRONTEND_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './scripts/docs-screenshots',
  testMatch: 'capture.spec.ts',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: frontendUrl,
    browserName: 'chromium',
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: process.env.DOCS_TIMEZONE ?? 'Asia/Jakarta',
    screenshot: 'off',
    trace: 'retain-on-failure',
  },
  outputDir: 'test-results/docs-screenshots',
});
