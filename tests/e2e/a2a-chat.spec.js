/**
 * Playwright E2E 测试：Claude 和 Codex 互相艾特并正确回复
 *
 * 运行方式：
 *   npx playwright test tests/e2e/a2a-chat.spec.js
 *
 * 前提条件：
 *   - 服务器已启动：node server/index.js
 *   - 端口 3200 可访问
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('A2A 聊天测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // 等待页面加载完成
    await expect(page.locator('h1')).toContainText('Chat Cafe');
  });

  test('页面应该正确加载', async ({ page }) => {
    // 检查标题
    await expect(page.locator('h1')).toContainText('Chat Cafe');

    // 检查连接状态
    const statusText = page.locator('#statusText');
    await expect(statusText).toContainText(/连接|已连接/i, { timeout: 10000 });
  });

  test('应该显示三只猫猫', async ({ page }) => {
    // 等待猫猫列表加载（使用 label.cat-pill 而不是 button）
    const catsContainer = page.locator('#cats');
    await expect(catsContainer).toBeVisible({ timeout: 10000 });

    // 检查三只猫的选项（label.cat-pill 包含 checkbox）
    const catPills = catsContainer.locator('label.cat-pill');
    await expect(catPills).toHaveCount(3, { timeout: 10000 });
  });

  test('应该能选择/取消选择猫猫', async ({ page }) => {
    const catsContainer = page.locator('#cats');
    const catPills = catsContainer.locator('label.cat-pill');

    // 等待加载
    await expect(catPills).toHaveCount(3, { timeout: 10000 });

    // 点击第一个 pill 取消选择（checkbox 被 CSS 隐藏，点击 label）
    await catPills.first().click();
    // 验证 checkbox 状态改变（虽然不可见但可以检查）
    const checkbox = catPills.first().locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked({ timeout: 5000 });

    // 再次点击重新选择
    await catPills.first().click();
    await expect(checkbox).toBeChecked({ timeout: 5000 });
  });

  test('应该能发送消息给 Claude', async ({ page }) => {
    // 取消选择其他猫，只选 opus
    const catPills = page.locator('#cats label.cat-pill');

    // 先取消全选（点击 pill 切换选中状态）
    const count = await catPills.count();
    for (let i = 0; i < count; i++) {
      const checkbox = catPills.nth(i).locator('input[type="checkbox"]');
      if (await checkbox.isChecked()) {
        await catPills.nth(i).click();
      }
    }

    // 只选第一个（opus）
    await catPills.first().click();

    // 输入消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('请回复"测试成功"');

    // 点击发送
    const runButton = page.locator('#runBtn');
    await runButton.click();

    // 等待回复
    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText('测试成功', { timeout: 120000 });
  });

  test('Claude 被 @ Codex 后，Codex 应该回复', async ({ page }) => {
    // 选择 opus
    const catPills = page.locator('#cats label.cat-pill');

    // 先取消全选
    const count = await catPills.count();
    for (let i = 0; i < count; i++) {
      const checkbox = catPills.nth(i).locator('input[type="checkbox"]');
      if (await checkbox.isChecked()) {
        await catPills.nth(i).click();
      }
    }

    // 只选 opus 和 codex
    await catPills.first().click(); // opus
    await catPills.nth(1).click();  // codex

    // 输入包含 @codex 的消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 请介绍一下你自己，然后 @codex 让它也介绍');

    // 点击发送
    const runButton = page.locator('#runBtn');
    await runButton.click();

    // 等待 opus 回复
    const logContainer = page.locator('#log');

    // opus 应该回复
    await expect(logContainer).toContainText(/opus|布偶猫|宪宪/i, { timeout: 120000 });

    // 等待 codex 回复（A2A 触发）
    await expect(logContainer).toContainText(/codex|缅因猫|砚砚/i, { timeout: 180000 });
  });
});

test.describe('A2A 链式调用测试', () => {
  test('应该支持 A @ B 链式调用', async ({ page }) => {
    await page.goto(BASE_URL);

    // 选择 opus
    const catPills = page.locator('#cats label.cat-pill');

    // 先取消全选
    const count = await catPills.count();
    for (let i = 0; i < count; i++) {
      const checkbox = catPills.nth(i).locator('input[type="checkbox"]');
      if (await checkbox.isChecked()) {
        await catPills.nth(i).click();
      }
    }

    // 只选 opus
    await catPills.first().click();

    // 输入链式调用消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 你好，请 @codex 帮忙验证');

    const runButton = page.locator('#runBtn');
    await runButton.click();

    const logContainer = page.locator('#log');

    // 等待 opus 回复
    await expect(logContainer).toContainText(/opus|布偶猫/i, { timeout: 120000 });

    // 等待 codex 回复
    await expect(logContainer).toContainText(/codex|缅因猫/i, { timeout: 180000 });
  });
});
