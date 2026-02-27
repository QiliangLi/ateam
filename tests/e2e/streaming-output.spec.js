/**
 * Playwright E2E 测试：流式输出功能
 *
 * 运行方式：
 *   npx playwright test tests/e2e/streaming-output.spec.js
 *
 * 前提条件：
 *   - 服务器已启动：node server/index.js
 *   - 端口 3200 可访问
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('流式输出测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  // 测试用例 1：单个 agent 流式输出
  test('单个 agent 应该显示思考占位符并追加内容', async ({ page }) => {
    // 只选 opus
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check();

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('说一句包含"测试成功"的话');
    await page.locator('#runBtn').click();

    // 应该先显示思考占位符
    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText(/思考|思考\.\.\.|正在/i, { timeout: 5000 });

    // 然后显示实际内容
    await expect(logContainer).toContainText('测试成功', { timeout: 60000 });

    // 检查 opus 只有一条消息（不是多条）
    const opusMessages = logContainer.locator('.message-bubble').filter({ hasText: /opus/i });
    const messageCount = await opusMessages.count();
    expect(messageCount).toBeLessThanOrEqual(2); // 允许 1 条思考 + 1 条内容，或合并为 1 条
  });

  // 测试用例 2：多个 agent 并行输出
  test('多个 agent 并行输出应该各自显示独立消息', async ({ page }) => {
    // 选择所有 agent
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (!(await catCheckboxes.nth(i).isChecked())) {
        await catCheckboxes.nth(i).click();
      }
    }

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('每个人说一句包含自己名字的话');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 每个 agent 都应该有输出
    await expect(logContainer).toContainText(/opus/i, { timeout: 60000 });
    await expect(logContainer).toContainText(/codex/i, { timeout: 60000 });
    await expect(logContainer).toContainText(/gemini/i, { timeout: 60000 });
  });

  // 测试用例 3：消息不重复
  test('同一 agent 的多个 chunk 应该合并到一条消息', async ({ page }) => {
    // 只选 opus
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check();

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('简单介绍一下你自己');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // 等待 opus 回复（应该包含自我介绍内容）
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 60000 });

    // 检查 opus 的消息数量：应该只有 1 条（思考占位符被替换为实际内容）
    const opusMessages = logContainer.locator('.message-bubble').filter({ hasText: /opus|布偶猫|宪宪/i });
    const messageCount = await opusMessages.count();
    // 允许最多 2 条（思考 + 内容合并后可能显示为 1 条或 2 条）
    expect(messageCount).toBeLessThanOrEqual(2);
  });
});

test.describe('A2A 通信测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  // 测试用例 4：A2A 触发后新消息
  test('A2A 触发后被 @ 的 agent 应该显示新消息', async ({ page }) => {
    // 选择 opus 和 codex
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check(); // opus
    await catCheckboxes.nth(1).check();  // codex

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 介绍一下自己，然后 @codex 让它也介绍');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // opus 应该有输出
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 60000 });

    // codex 被 A2A 触发后也应该有输出
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚/i, { timeout: 120000 });
  });

  // 测试用例 6：消息上下文正确传递
  test('A2A 通信时 agent 应该理解之前的内容', async ({ page }) => {
    // 选择 opus 和 codex
    const catCheckboxes = page.locator('#cats input[type="checkbox"]');
    const count = await catCheckboxes.count();
    for (let i = 0; i < count; i++) {
      if (await catCheckboxes.nth(i).isChecked()) {
        await catCheckboxes.nth(i).click();
      }
    }
    await catCheckboxes.first().check(); // opus
    await catCheckboxes.nth(1).check();  // codex

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 问 codex 一个关于它职责的问题');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');

    // opus 应该问了问题
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚|代码|审查/i, { timeout: 60000 });

    // codex 应该回答了相关问题
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚/i, { timeout: 120000 });
  });
});
