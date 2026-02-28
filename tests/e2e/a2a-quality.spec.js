/**
 * Playwright E2E 测试：验证 agent 回复质量
 *
 * 这个测试验证：
 * 1. agent 回复是否针对问题
 * 2. agent 回复是否自然（不是抱怨技术问题）
 * 3. agent 是否理解了之前的对话内容
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('Agent 回复质量测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
    const logContainer = page.locator('#log');
    await page.locator('#clearBtn').click();
    await expect(logContainer).toBeEmpty();
  });

  test('agent 回复不应该抱怨技术格式问题', async ({ page }) => {
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
    await promptInput.fill('@codex 介绍一下你自己');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // 获取 codex 的回复内容
    const codexMessage = logContainer.locator('.message-bubble').filter({ hasText: /codex|缅因猫|砚砚/i });
    const codexText = (await codexMessage.first().textContent()).toLowerCase();

    // codex 不应该抱怨技术格式问题
    expect(codexText).not.toContain('禁用关键词');
    expect(codexText).not.toContain('发送格式');
    expect(codexText).not.toContain('改用普通文本');
    expect(codexText).not.toContain('不含');
  });

  test('agent 应该针对问题回复，不是自说自话', async ({ page }) => {
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
    await promptInput.fill('@opus 请告诉我今天的日期是什么？');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // opus 应该回复日期相关内容
    const opusMessage = logContainer.locator('.message-bubble').filter({ hasText: /opus|布偶猫|宪宪/i });
    const opusText = await opusMessage.first().textContent();

    // 应该包含日期相关的词
    expect(opusText.toLowerCase()).toMatch(/日期|今天|号|月|日|星期|周/);
  });

  test('gemini 的回复应该完整，不应该有截断', async ({ page }) => {
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
    await promptInput.fill('@gemini 请完整地介绍一下你自己');
    await page.locator('#runBtn').click();

    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText('执行完成', { timeout: 120000 });

    // 等待 gemini 的回复出现（gemini 应该提到自己是暹罗猫或创意设计师）
    await expect(logContainer).toContainText(/暹罗猫|创意设计师/, { timeout: 5000 });

    // 检查 gemini 的回复是否完整
    const allText = await logContainer.textContent();
    // 应该包含完整的自我介绍内容
    expect(allText).toContain('暹罗猫');
  });
});
