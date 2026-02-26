/**
 * Playwright 配置文件
 */

module.exports = {
  testDir: './tests/e2e',
  timeout: 120000,
  expect: {
    timeout: 30000
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.CAT_CAFE_URL || 'http://localhost:3200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true
      }
    }
  ],
  webServer: {
    command: 'node server/index.js',
    url: 'http://localhost:3200',
    reuseExistingServer: !process.env.CI,
    timeout: 10000
  }
};
