/**
 * Playwright E2E 测试：agent @ 规则
 *
 * 测试 agent 被调用时不会声明"我不能 @ 自己"
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('Agent @ 规则测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  test('codex 被调用时不应说"我不能 @ 自己"', async ({ page }) => {
    // 创建新会话
    await page.locator('#newSessionBtn').click();
    await page.waitForTimeout(500);

    // 只选 codex
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.nth(1).check(); // codex

    const promptInput = page.locator('#prompt');
    await promptInput.fill('@codex 你好，请介绍一下你自己');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // 检查 codex 的回复
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚/i, { timeout: 5000 });

    // 检查不应该包含"我不能 @ 自己"或类似声明
    const allText = await logContainer.textContent();
    expect(allText).not.toContain('我不能 @ 自己');
    expect(allText).not.toContain('不能 @ 自己');
    expect(allText).not.toContain('不能艾特自己');
    expect(allText).not.toContain('禁止 @ 自己');
  });

  test('opus 被调用时不应说"我不能 @ 自己"', async ({ page }) => {
    // 创建新会话
    await page.locator('#newSessionBtn').click();
    await page.waitForTimeout(500);

    // 只选 opus
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check(); // opus

    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 你好');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // 检查不应该包含"我不能 @ 自己"
    const allText = await logContainer.textContent();
    expect(allText).not.toContain('我不能 @ 自己');
    expect(allText).not.toContain('不能 @ 自己');
  });
});
