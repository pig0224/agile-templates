import { test, expect } from '@playwright/test';

// 冒烟起点：首页可打开且挂载点渲染。
// 关键路径用例按 gen-test.md「前端用例」节中标 e2e 的条目逐步补充到本目录。
test('首页可渲染', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('#root')).toBeVisible();
});
