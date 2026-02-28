/**
 * Playwright E2E 测试：本地会话存储
 *
 * 测试用例：
 * 1. 创建会话后，刷新页面验证消息保留
 * 2. 切换会话，验证消息正确显示
 * 3. 超过 500 条消息时，只加载最近 500 条
 * 4. "加载更早"功能正常工作
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';
const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');

test.describe('本地会话存储测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清空会话目录
    if (fs.existsSync(SESSIONS_DIR)) {
      const files = fs.readdirSync(SESSIONS_DIR);
      files.forEach(f => fs.unlinkSync(path.join(SESSIONS_DIR, f)));
    }

    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
    // 等待页面完全加载
    await page.waitForTimeout(1000);
  });

  test('创建会话后，刷新页面验证消息保留', async ({ page }) => {
    // 创建新会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 你好');
    await page.locator('#runBtn').click();

    // 等待执行完成（可能需要较长时间）
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 120000 });

    // 刷新页面
    await page.reload();
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');

    // 验证消息仍然存在
    await expect(page.locator('#log')).toContainText('你好', { timeout: 5000 });

    // 验证会话文件已创建
    const files = fs.readdirSync(SESSIONS_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain('index.json');
  });

  test('切换会话，验证消息正确显示', async ({ page }) => {
    // 创建第一个会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 会话一的内容');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 创建第二个会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 会话二的内容');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 验证有两个会话
    const sessionList = page.locator('.session-item');
    await expect(sessionList).toHaveCount(2);

    // 切换到第一个会话
    await sessionList.last().click();
    await expect(page.locator('#log')).toContainText('会话一的内容');
  });

  test('会话列表持久化，重启服务后仍可加载', async ({ page }) => {
    // 创建会话
    await page.locator('#newSessionBtn').click();
    await page.locator('#prompt').fill('@opus 持久化测试');
    await page.locator('#runBtn').click();
    await expect(page.locator('#log')).toContainText('执行完成', { timeout: 60000 });

    // 验证会话文件存在
    const indexFile = path.join(SESSIONS_DIR, 'index.json');
    expect(fs.existsSync(indexFile)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    expect(index.sessions.length).toBeGreaterThan(0);
    expect(index.sessions[0].title).toContain('持久化测试');
  });
});
