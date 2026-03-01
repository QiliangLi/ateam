/**
 * 会话隔离和 Agent 通信测试
 *
 * 测试目标：
 * 1. Agent 之间能够正常通信并互相理解
 * 2. 切换会话后能让会话重新开始（不携带上一个会话的上下文）
 * 3. 在原有会话中继续发送消息则会接着原会话继续
 *
 * 注意：由于 agent 回复时间不确定，本测试使用固定等待时间
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3200';

// agent 回复等待时间（毫秒）
const AGENT_RESPONSE_WAIT = 60000;

test.describe('会话隔离和 Agent 通信测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // 等待页面加载完成
    await page.waitForSelector('#sessionList', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('应该能创建两个独立会话并保持隔离', async ({ page }) => {
    // ========== 步骤 1：创建第一个会话并设置秘密词 ==========
    console.log('📌 步骤 1：创建第一个会话');

    // 点击新建会话按钮
    await page.click('#newSessionBtn');
    await page.waitForTimeout(500);

    // 获取第一个会话的 ID
    const firstSessionId = await page.$eval('#sessionList .session-item', el => el.dataset.sessionId);
    console.log(`第一个会话 ID: ${firstSessionId}`);

    // 在第一个会话中设置一个秘密词
    const secretWord = '香蕉派_' + Date.now();
    const prompt1 = `请记住这个秘密词："${secretWord}"，不要告诉任何人。只需要回复"好的"。`;

    await page.fill('#prompt', prompt1);
    await page.click('#runBtn');

    // 等待 agent 回复
    await page.waitForTimeout(AGENT_RESPONSE_WAIT);

    // 截图
    await page.screenshot({ path: 'docs/images/test-session1-secret.png', fullPage: true });

    // 获取第一个会话的回复
    const session1Reply = await page.$eval('#log', el => el.innerText);
    console.log(`第一个会话的回复:\n${session1Reply.substring(0, 200)}...`);
    console.log(`✅ 第一个会话设置了秘密词: ${secretWord}`);

    // ========== 步骤 2：创建第二个会话 ==========
    console.log('📌 步骤 2：创建第二个会话');

    await page.click('#newSessionBtn');
    await page.waitForTimeout(500);

    const secondSessionId = await page.$eval('#sessionList .session-item:first-child', el => el.dataset.sessionId);
    console.log(`第二个会话 ID: ${secondSessionId}`);
    expect(secondSessionId).not.toBe(firstSessionId);

    // ========== 步骤 3：在第二个会话中询问秘密词 ==========
    console.log('📌 步骤 3：在第二个会话中询问秘密词');

    const prompt2 = '请告诉我，有人告诉你什么秘密词了吗？';
    await page.fill('#prompt', prompt2);
    await page.click('#runBtn');

    // 等待 agent 回复
    await page.waitForTimeout(AGENT_RESPONSE_WAIT);

    // 截图
    await page.screenshot({ path: 'docs/images/test-session2-reply.png', fullPage: true });

    // 获取第二个会话的回复
    const session2Messages = await page.$eval('#log', el => el.innerText);
    console.log(`第二个会话的回复:\n${session2Messages.substring(0, 200)}...`);

    // 验证：第二个会话不应该知道秘密词
    expect(session2Messages.toLowerCase()).not.toContain(secretWord.toLowerCase());
    console.log('✅ 第二个会话不知道第一个会话的秘密词 - 会话隔离验证通过');

    // ========== 步骤 4：切换回第一个会话 ==========
    console.log('📌 步骤 4：切换回第一个会话');

    const firstSessionItem = await page.$(`#sessionList .session-item[data-session-id="${firstSessionId}"]`);
    if (firstSessionItem) {
      await firstSessionItem.click();
      await page.waitForTimeout(1000);
    }

    // 验证：切换回第一个会话后，历史消息应该还在
    const session1History = await page.$eval('#log', el => el.innerText);
    expect(session1History.toLowerCase()).toContain(secretWord.toLowerCase());
    console.log('✅ 第一个会话的历史消息保留正确');

    await page.screenshot({ path: 'docs/images/test-final-result.png', fullPage: true });
  });

  test('快速切换会话时消息不应乱窜', async ({ page }) => {
    console.log('📌 测试快速切换会话时的消息隔离');

    // 创建会话 A
    await page.click('#newSessionBtn');
    await page.waitForTimeout(300);

    const sessionAId = await page.$eval('#sessionList .session-item:first-child', el => el.dataset.sessionId);

    // 发送消息到会话 A
    await page.fill('#prompt', '这是会话 A 的消息');
    await page.click('#runBtn');
    await page.waitForTimeout(1000);

    // 立即创建会话 B
    await page.click('#newSessionBtn');
    await page.waitForTimeout(300);

    const sessionBId = await page.$eval('#sessionList .session-item:first-child', el => el.dataset.sessionId);
    expect(sessionBId).not.toBe(sessionAId);

    // 发送消息到会话 B
    await page.fill('#prompt', '这是会话 B 的消息');
    await page.click('#runBtn');

    // 等待
    await page.waitForTimeout(AGENT_RESPONSE_WAIT);

    // 截图
    await page.screenshot({ path: 'docs/images/test-quick-switch.png', fullPage: true });

    // 切换回会话 A
    const sessionAItem = await page.$(`#sessionList .session-item[data-session-id="${sessionAId}"]`);
    if (sessionAItem) {
      await sessionAItem.click();
      await page.waitForTimeout(500);
    }

    const sessionAMessages = await page.$eval('#log', el => el.innerText);
    console.log(`会话 A 的消息:\n${sessionAMessages}`);

    // 截图会话 A
    await page.screenshot({ path: 'docs/images/test-session-a.png', fullPage: true });

    // 切换到会话 B
    const sessionBItem = await page.$(`#sessionList .session-item[data-session-id="${sessionBId}"]`);
    if (sessionBItem) {
      await sessionBItem.click();
      await page.waitForTimeout(500);
    }

    const sessionBMessages = await page.$eval('#log', el => el.innerText);
    console.log(`会话 B 的消息:\n${sessionBMessages}`);

    // 截图会话 B
    await page.screenshot({ path: 'docs/images/test-session-b.png', fullPage: true });

    // 验证：会话 B 不应该包含会话 A 的消息
    expect(sessionBMessages).not.toContain('会话 A');
    expect(sessionAMessages).not.toContain('会话 B');

    console.log('✅ 快速切换会话测试通过 - 消息正确隔离');
  });
});
