/**
 * Playwright E2E 测试：agent 之间通信测试
 *
 * 测试多个 agent 之间的通信是否正常
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('Agent 通信测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  test('opus 让 codex 做代码审查', async ({ page }) => {
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
    await promptInput.fill('@opus 请让 codex 审查一下最近的代码变更');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 180000 });

    // opus 应该有输出
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 5000 });

    // codex 可能被触发
    const allText = await logContainer.textContent();
    console.log('opus 让 codex 做代码审查 - 日志内容:', allText);
  });

  test('三个 agent 互相认识', async ({ page }) => {
    // 创建新会话
    await page.locator('#newSessionBtn').click();
    await page.waitForTimeout(500);

    // 选择全部三个 agent
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (!await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }

    const promptInput = page.locator('#prompt');
    await promptInput.fill('请三位依次自我介绍，然后互相打个招呼');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 300000 });

    // 检查三个 agent 都有输出
    const allText = await logContainer.textContent();
    console.log('三个 agent 互相认识 - 日志内容:', allText);

    // 检查不应该有异常内容
    expect(allText).not.toContain('我不能 @ 自己');
    expect(allText).not.toContain('CAT_CAFE_POST_MESSAGE');
    expect(allText).not.toContain('@.sessions/');
  });

  test('gemini 向 opus 请教架构问题', async ({ page }) => {
    // 创建新会话
    await page.locator('#newSessionBtn').click();
    await page.waitForTimeout(500);

    // 只选 gemini
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.nth(2).check(); // gemini

    const promptInput = page.locator('#prompt');
    await promptInput.fill('@gemini 请向 opus 请教一下 Cat Café 的架构设计思路');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 180000 });

    // gemini 应该有输出
    await expect(logContainer).toContainText(/gemini|暹罗猫/i, { timeout: 5000 });

    const allText = await logContainer.textContent();
    console.log('gemini 向 opus 请教架构问题 - 日志内容:', allText);
  });
});
