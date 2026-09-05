import { defineConfig } from '@playwright/test';

// e2e 主要测试工具：Playwright；浏览器行为调试用 Chrome DevTools 辅助。
// 运行产物（test-results/、playwright-report/）已在 .gitignore，不提交。
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
