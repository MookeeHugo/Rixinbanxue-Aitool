import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120 * 1000,
  expect: { timeout: 15 * 1000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    colorScheme: 'light',
  },
  globalSetup: './tests/e2e/auth.setup.ts',
  projects: [
    {
      name: 'teacher-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/teacher.json',
      },
    },
    {
      name: 'student-chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/student.json',
      },
    },
    {
      name: 'teacher-webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/teacher.json',
      },
    },
  ],
});
