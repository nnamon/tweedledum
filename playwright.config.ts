import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results/output',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  // BASE_URL runs the suite against a deployed copy, e.g. https://nnamon.github.io/tweedledum/
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173/' },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        timeout: 180_000,
        reuseExistingServer: true,
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
    { name: 'phone', use: { ...devices['iPhone 13'] } },
    { name: 'pixel', use: { ...devices['Pixel 7'] }, testMatch: /scroll\.spec/ },
  ],
});
