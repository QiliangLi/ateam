/**
 * Playwright E2E 测试：验证 agent 之间真正理解对方的回复
 *
 * 这个测试验证：
 * 1. agent A 问问题，agent B 回答的是针对 A 的问题
 * 2. 不是自说自话
 * 3. 身份正确（gemini 不会说自己是 opus）
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('Agent 通信理解测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');

    // 等待页面完全加载，清空之前的消息
    const logContainer = page.locator('#log');
    await page.locator('#clearBtn').click();
    await expect(logContainer).toBeEmpty();
  });

  test('opus 问 codex 问题，codex 应该回答 opus 的问题', async ({ page }) => {
    // 只选 opus
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check(); // opus

    // 发送一个明确要求 @codex 回答特定问题的消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('请 @codex 告诉我你最擅长的编程语言是什么？');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待 "执行完成" 消息，确保所有 agent 都执行完了
    await expect(logContainer).toContainText('执行完成', { timeout: 180000 });

    // opus 应该有输出（问问题）
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 5000 });

    // codex 被 A2A 触发后应该有输出
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚/i, { timeout: 5000 });

    // codex 的回复应该包含编程语言相关内容（不是自说自话）
    const codexMessage = logContainer.locator('.message-bubble').filter({ hasText: /codex/i });
    const codexText = await codexMessage.first().textContent();
    // 应该提到编程语言或代码相关内容
    expect(codexText.toLowerCase()).toMatch(/语言|code|python|javascript|编程|代码|java|typescript|审查/);
  });

  test('gemini 应该正确识别自己的身份', async ({ page }) => {
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
    await promptInput.fill('请告诉我你是谁？你的名字是什么？');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // gemini 应该提到自己的身份（在消息区域，不是选择器区域）
    await expect(logContainer).toContainText(/gemini|暹罗猫|暹罗/i, { timeout: 5000 });

    // gemini 不应该说自己是 opus 或 codex
    const allText = await logContainer.textContent();
    expect(allText.toLowerCase()).not.toContain('我是opus');
    expect(allText.toLowerCase()).not.toContain('我是 opus');
    expect(allText.toLowerCase()).not.toContain('我是codex');
    expect(allText.toLowerCase()).not.toContain('我是 codex');
  });

  test('多个 agent 交流时不应该身份混淆', async ({ page }) => {
    // 选择 opus 和 gemini
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check(); // opus
    await catCheckboxes.nth(2).check();  // gemini

    const promptInput = page.locator('#prompt');
    await promptInput.fill('每个人请介绍自己，说出自己的名字');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待执行完成
    await expect(logContainer).toContainText('执行完成', { timeout: 180000 });

    // opus 应该提到自己的身份
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 5000 });

    // gemini 应该提到自己的身份
    await expect(logContainer).toContainText(/gemini|暹罗猫|暹罗/i, { timeout: 5000 });
  });
});
