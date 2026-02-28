/**
 * Playwright E2E 测试：历史对话记录功能
 *
 * 测试用例：
 * 1. 创建新会话，发送消息，刷新页面验证消息保留
 * 2. 切换会话，验证消息正确显示
 * 3. 搜索会话，验证搜索结果
 * 4. 重命名会话，验证标题更新
 * 5. 删除会话，验证会话移除
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

test.describe('历史对话记录测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
    // 清空 localStorage
    await page.evaluate(() => localStorage.clear());
    // 等待 thread 释放
    await page.waitForTimeout(1000);
    await page.reload();
    // 等待页面加载完成
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  test('创建新会话，发送消息，刷新页面验证消息保留', async ({ page }) => {
    // 点击新会话按钮
    const newSessionBtn = page.locator('#newSessionBtn');
    await expect(newSessionBtn).toBeVisible();
    await newSessionBtn.click();

    // 验证新会话出现在列表中
    const sessionList = page.locator('.session-item');
    await expect(sessionList).toHaveCount(1);

    // 发送消息
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 你好');
    await page.locator('#runBtn').click();

    // 等待回复
    const logContainer = page.locator('#log');
    await expect(logContainer).toContainText('执行完成', { timeout: 60000 });

    // 刷新页面
    await page.reload();

    // 等待页面加载完成
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');

    // 验证消息仍然存在（从会话中加载）
    await expect(logContainer).toContainText('你好', { timeout: 5000 });
  });

  test('切换会话，验证消息正确显示', async ({ page }) => {
    // 创建第一个会话
    await page.locator('#newSessionBtn').click();
    const promptInput = page.locator('#prompt');
    await promptInput.fill('@opus 讨论架构设计');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 创建第二个会话
    await page.locator('#newSessionBtn').click();
    await promptInput.fill('@opus 讨论测试方案');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 验证有两个会话
    const sessionList = page.locator('.session-item');
    await expect(sessionList).toHaveCount(2);

    // 点击第一个会话（应该是最新创建的，即"讨论测试方案"）
    await sessionList.first().click();

    // 验证显示的是会话内容
    await expect(page.locator('#log')).toContainText('讨论测试方案');
  });

  test('搜索会话，验证搜索结果', async ({ page }) => {
    // 创建两个会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 讨论架构设计');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 讨论测试方案');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 搜索"架构"
    const searchInput = page.locator('#sessionSearch');
    await searchInput.fill('架构');

    // 验证只显示包含"架构"的会话
    const sessionList = page.locator('.session-item');
    await expect(sessionList).toHaveCount(1);
    await expect(sessionList.first()).toContainText('架构');
  });

  test('重命名会话，验证标题更新', async ({ page }) => {
    // 创建会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 测试重命名');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 悬停在会话项上以显示操作按钮
    const sessionItem = page.locator('.session-item').first();
    await sessionItem.hover();

    // 点击重命名按钮
    const renameBtn = page.locator('.session-rename').first();
    await renameBtn.waitFor({ state: 'visible' });
    await renameBtn.click();

    // 输入新标题
    const titleInput = page.locator('.session-title-input');
    await titleInput.fill('我的新标题');
    await titleInput.press('Enter');

    // 验证标题已更新
    await expect(page.locator('.session-item').first()).toContainText('我的新标题');
  });

  test('删除会话，验证会话移除', async ({ page }) => {
    // 创建会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 测试删除');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 验证有一个会话
    const sessionList = page.locator('.session-item');
    await expect(sessionList).toHaveCount(1);

    // 悬停在会话项上以显示操作按钮
    await sessionList.first().hover();

    // 点击删除按钮
    const deleteBtn = page.locator('.session-delete').first();
    await deleteBtn.waitFor({ state: 'visible' });

    // 监听确认对话框
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();

    // 验证会话已移除
    await expect(sessionList).toHaveCount(0);
  });
});
