import { defineConfig } from '@playwright/test';

// Takes the README screenshots into assets/screenshots/:
//   docker compose run --rm -T e2e npx playwright test -c readme-shots.config.ts
export default defineConfig({
  testDir: 'scripts',
  testMatch: /readme-shots\.spec\.ts/,
  outputDir: 'test-results/readme-shots',
  timeout: 120_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: true,
  },
});
