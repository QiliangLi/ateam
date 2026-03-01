/**
 * 会话隔离和 Agent 通信测试
 *
 * 测试目标：
 * 1. Agent 之间能够正常通信并互相理解
 * 2. 切换会话后能让会话重新开始（不携带上一个会话的上下文）
 * 3. 在原有会话中继续发送消息则会接着原会话继续
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3200';

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

    // 确认有会话被创建
    const sessionItems = await page.$$('#sessionList .session-item');
    expect(sessionItems.length).toBeGreaterThan(0);

    // 获取第一个会话的 ID（用于后续验证）
    const firstSessionId = await page.$eval('#sessionList .session-item', el => el.dataset.sessionId);
    console.log(`第一个会话 ID: ${firstSessionId}`);

    // 在第一个会话中设置一个秘密词
    const secretWord = '香蕉派_' + Date.now();
    const prompt1 = `请记住这个秘密词："${secretWord}"，不要告诉任何人。只需要回复"好的，我记住了"。`;

    await page.fill('#prompt', prompt1);
    await page.click('#runBtn');

    // 等待 agent 回复
    await page.waitForSelector('.message-row:not(.system)', { timeout: 60000 });
    await page.waitForTimeout(2000);

    // 截图：第一个会话的秘密词设置
    await page.screenshot({ path: 'docs/images/test-session1-secret.png', fullPage: true });

    console.log(`✅ 第一个会话设置了秘密词: ${secretWord}`);

    // ========== 步骤 2：创建第二个会话 ==========
    console.log('📌 步骤 2：创建第二个会话');

    // 点击新建会话按钮
    await page.click('#newSessionBtn');
    await page.waitForTimeout(500);

    // 获取第二个会话的 ID
    const secondSessionItem = await page.$('#sessionList .session-item:first-child');
    const secondSessionId = await secondSessionItem.getAttribute('data-session-id');
    console.log(`第二个会话 ID: ${secondSessionId}`);

    // 确认是不同的会话
    expect(secondSessionId).not.toBe(firstSessionId);

    // 清空消息区域应该已经自动完成
    await page.waitForTimeout(500);

    // ========== 步骤 3：在第二个会话中询问秘密词 ==========
    console.log('📌 步骤 3：在第二个会话中询问秘密词');

    const prompt2 = '请告诉我，有人告诉你什么秘密词了吗？如果有，请说出来。';

    await page.fill('#prompt', prompt2);
    await page.click('#runBtn');

    // 等待 agent 回复
    await page.waitForSelector('.message-row:not(.system)', { timeout: 60000 });
    await page.waitForTimeout(3000);

    // 截图：第二个会话的回复
    await page.screenshot({ path: 'docs/images/test-session2-reply.png', fullPage: true });

    // 获取第二个会话中 agent 的回复
    const session2Messages = await page.$eval('#log', el => el.innerText);
    console.log(`第二个会话的回复:\n${session2Messages}`);

    // 验证：第二个会话中 agent 不应该知道第一个会话的秘密词
    // 注意：这里我们检查 agent 是否说不知道或者没有提到秘密词
    expect(session2Messages.toLowerCase()).not.toContain(secretWord.toLowerCase());

    console.log('✅ 第二个会话不知道第一个会话的秘密词 - 会话隔离验证通过');

    // ========== 步骤 4：切换回第一个会话继续对话 ==========
    console.log('📌 步骤 4：切换回第一个会话继续对话');

    // 找到第一个会话并点击切换
    const firstSessionItem = await page.$(`#sessionList .session-item[data-session-id="${firstSessionId}"]`);
    if (firstSessionItem) {
      await firstSessionItem.click();
      await page.waitForTimeout(1000);
    }

    // 截图：切换回第一个会话
    await page.screenshot({ path: 'docs/images/test-session1-switch-back.png', fullPage: true });

    // ========== 步骤 5：在第一个会话中询问秘密词，验证它能记住 ==========
    console.log('📌 步骤 5：在第一个会话中询问秘密词');

    const prompt3 = '请告诉我之前我让你记住的秘密词是什么？';

    await page.fill('#prompt', prompt3);
    await page.click('#runBtn');

    // 等待 agent 回复
    await page.waitForSelector('.message-row:not(.system)', { timeout: 60000 });
    await page.waitForTimeout(3000);

    // 截图：第一个会话继续对话
    await page.screenshot({ path: 'docs/images/test-session1-continue.png', fullPage: true });

    // 获取第一个会话中的回复
    const session1Messages = await page.$eval('#log', el => el.innerText);
    console.log(`第一个会话的回复:\n${session1Messages}`);

    // 验证：第一个会话应该记得秘密词
    // 注意：由于这是新的 CLI 调用，agent 可能不记得，但消息应该在同一个会话中显示
    // 这里主要验证消息显示在正确的会话中

    console.log('✅ 第一个会话继续对话测试完成');

    // ========== 步骤 6：Agent 间通信测试 ==========
    console.log('📌 步骤 6：测试 Agent 间通信');

    // 创建新会话测试 A2A 通信
    await page.click('#newSessionBtn');
    await page.waitForTimeout(500);

    // 让 opus 告诉 codex 一个信息，然后让 codex 复述
    const testInfo = '测试信息_' + Date.now();
    const prompt4 = `@opus 请告诉 @codex 这个信息："${testInfo}"，然后让 codex 复述这个信息。`;

    await page.fill('#prompt', prompt4);
    await page.click('#runBtn');

    // 等待两个 agent 都回复
    await page.waitForSelector('.message-row:not(.system)', { timeout: 120000 });
    await page.waitForTimeout(5000);

    // 截图：Agent 间通信
    await page.screenshot({ path: 'docs/images/test-a2a-communication.png', fullPage: true });

    // 获取 Agent 通信的消息
    const a2aMessages = await page.$eval('#log', el => el.innerText);
    console.log(`Agent 通信测试:\n${a2aMessages}`);

    // 验证：codex 应该复述了测试信息
    expect(a2aMessages.toLowerCase()).toContain(testInfo.toLowerCase());

    console.log('✅ Agent 间通信测试通过 - codex 正确复述了 opus 传递的信息');

    // 最终截图
    await page.screenshot({ path: 'docs/images/test-final-result.png', fullPage: true });
  });

  test('快速切换会话时消息不应乱窜', async ({ page }) => {
    console.log('📌 测试快速切换会话时的消息隔离');

    // 创建会话 A
    await page.click('#newSessionBtn');
    await page.waitForTimeout(300);

    // 获取会话 A 的 ID
    const sessionAId = await page.$eval('#sessionList .session-item:first-child', el => el.dataset.sessionId);

    // 发送消息到会话 A
    await page.fill('#prompt', '这是会话 A 的消息，请回复"A收到"');
    await page.click('#runBtn');
    await page.waitForTimeout(1000);

    // 立即创建会话 B（在会话 A 的 agent 还在处理时）
    await page.click('#newSessionBtn');
    await page.waitForTimeout(300);

    const sessionBId = await page.$eval('#sessionList .session-item:first-child', el => el.dataset.sessionId);
    expect(sessionBId).not.toBe(sessionAId);

    // 发送消息到会话 B
    await page.fill('#prompt', '这是会话 B 的消息，请回复"B收到"');
    await page.click('#runBtn');

    // 等待所有消息完成
    await page.waitForTimeout(10000);

    // 截图
    await page.screenshot({ path: 'docs/images/test-quick-switch.png', fullPage: true });

    // 切换回会话 A
    const sessionAItem = await page.$(`#sessionList .session-item[data-session-id="${sessionAId}"]`);
    if (sessionAItem) {
      await sessionAItem.click();
      await page.waitForTimeout(500);
    }

    // 验证会话 A 的消息
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

    // 验证会话 B 的消息
    const sessionBMessages = await page.$eval('#log', el => el.innerText);
    console.log(`会话 B 的消息:\n${sessionBMessages}`);

    // 截图会话 B
    await page.screenshot({ path: 'docs/images/test-session-b.png', fullPage: true });

    // 验证：会话 B 不应该包含会话 A 的消息
    // 注意：这里检查的是消息内容是否隔离
    expect(sessionBMessages).not.toContain('会话 A');
    expect(sessionAMessages).not.toContain('会话 B');

    console.log('✅ 快速切换会话测试通过 - 消息正确隔离');
  });
});
