import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-real',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'py -m uvicorn app.main:app --host 127.0.0.1 --port 9003',
      cwd: '../backend',
      url: 'http://127.0.0.1:9003/openapi.json',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4175',
      cwd: '.',
      env: {
        ...process.env,
        VITE_API_URL: 'http://127.0.0.1:9003/api',
      },
      url: 'http://127.0.0.1:4175/#/login',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
