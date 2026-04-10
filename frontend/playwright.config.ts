import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: поднимите фронт (`npm start`) и при необходимости бэкенд.
 * По умолчанию http://127.0.0.1:3000 — задайте PLAYWRIGHT_BASE_URL при другом хосте (например :8080 из Docker).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
});
