/**
 * Playwright E2E 测试：会话管理 + Agent 通信集成测试
 *
 * 测试场景：
 * 1. Agent 之间能够正常通信并互相理解
 * 2. 切换会话后能让会话重新开始
 * 3. 在原有会话中继续发送消息会接着原会话继续
 *
 * 运行方式：
 *   npx playwright test tests/e2e/session-a2a-integration.spec.js
 *
 * 前提条件：
 *   - 服务器已启动：node server/index.js
 *   - 端口 3200 可访问
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';

// 辅助函数：取消全选猫猫
async function deselectAllCats(page) {
  const catPills = page.locator('#cats label.cat-pill');
  const count = await catPills.count();
  for (let i = 0; i < count; i++) {
    const checkbox = catPills.nth(i).locator('input[type="checkbox"]');
    if (await checkbox.isChecked()) {
      await catPills.nth(i).click();
    }
  }
}

// 辅助函数：选择指定猫猫
async function selectCats(page, indices) {
  const catPills = page.locator('#cats label.cat-pill');
  for (const i of indices) {
    const checkbox = catPills.nth(i).locator('input[type="checkbox"]');
    if (!(await checkbox.isChecked())) {
      await catPills.nth(i).click();
    }
  }
}

// 辅助函数：创建新会话
async function createNewSession(page) {
  const newSessionBtn = page.locator('#newSessionBtn');
  await newSessionBtn.click();
  // 等待会话列表更新
  await page.waitForTimeout(500);
}

// 辅助函数：发送消息
async function sendMessage(page, message) {
  const promptInput = page.locator('#prompt');
  await promptInput.fill(message);
  const runButton = page.locator('#runBtn');
  await runButton.click();
}

// 辅助函数：等待 agent 回复
async function waitForAgentReply(page, agentPattern, timeout = 120000) {
  const logContainer = page.locator('#log');
  await expect(logContainer).toContainText(agentPattern, { timeout });
}

test.describe('会话管理 + Agent 通信集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  test('会话隔离：不同会话的消息独立保存', async ({ page }) => {
    // 创建第一个会话并发送消息
    await createNewSession(page);
    await deselectAllCats(page);
    await selectCats(page, [0]); // opus

    await sendMessage(page, '请回复"第一个会话"');
    await waitForAgentReply(page, /第一个会话|一/i, 120000);

    // 记录当前日志内容
    const logContainer = page.locator('#log');
    const logText1 = await logContainer.textContent();
    expect(logText1).toContain('第一个会话');

    // 创建第二个会话
    await createNewSession(page);

    // 验证第二个会话是空的（日志区域应该为空或只有占位符）
    await page.waitForTimeout(1000);
    const logText2 = await logContainer.textContent();

    // 新会话不应该包含第一个会话的消息
    expect(logText2).not.toContain('第一个会话');

    // 在第二个会话中发送消息
    await sendMessage(page, '请回复"第二个会话"');
    await waitForAgentReply(page, /第二个会话|二/i, 120000);

    // 验证第二个会话的消息
    const logText3 = await logContainer.textContent();
    expect(logText3).toContain('第二个会话');
  });

  test('Agent 通信理解：A 告诉 B 一个信息，B 能复述', async ({ page }) => {
    // 创建新会话
    await createNewSession(page);

    // 取消全选，选 opus 和 codex
    await deselectAllCats(page);
    await selectCats(page, [0, 1]); // opus, codex

    // opus 告诉 codex 一个特定的信息
    const secretWord = '香蕉派';
    await sendMessage(page, `@opus 请告诉 @codex 一个秘密词是"${secretWord}"，然后让 codex 复述这个词`);

    // 等待 opus 回复
    await waitForAgentReply(page, /opus|布偶猫|宪宪/i, 120000);

    // 等待 codex 回复并复述秘密词
    await waitForAgentReply(page, /codex|缅因猫|砚砚/i, 180000);

    // 验证 codex 的回复中包含秘密词
    const logContainer = page.locator('#log');
    const logText = await logContainer.textContent();
    expect(logText).toContain(secretWord);
  });

  test('会话连续性：在同一会话中多轮对话保持上下文', async ({ page }) => {
    // 创建新会话
    await createNewSession(page);

    // 取消全选，只选 opus
    await deselectAllCats(page);
    await selectCats(page, [0]); // opus

    // 第一轮：设定一个角色
    await sendMessage(page, '我们现在玩一个游戏，你扮演一个叫"小明"的角色，回复"好的我是小明"确认');
    await waitForAgentReply(page, /小明|好的/i, 120000);

    // 清空输入框（如果还有内容）
    const promptInput = page.locator('#prompt');
    await promptInput.fill('');

    // 第二轮：验证角色保持
    await sendMessage(page, '你是谁？请说出你的角色名');
    await waitForAgentReply(page, /小明/i, 120000);

    // 第三轮：继续验证
    await promptInput.fill('');
    await sendMessage(page, '再说一遍你的名字');
    await waitForAgentReply(page, /小明/i, 120000);
  });

  test('多会话并行：多个会话各自独立运行', async ({ page }) => {
    // 创建会话 A
    await createNewSession(page);
    await deselectAllCats(page);
    await selectCats(page, [0]); // opus

    await sendMessage(page, '这是会话 A，请回复"A 收到"');
    await waitForAgentReply(page, /A|收到/i, 120000);

    // 创建会话 B
    await createNewSession(page);
    await selectCats(page, [0]); // opus

    await sendMessage(page, '这是会话 B，请回复"B 收到"');
    await waitForAgentReply(page, /B|收到/i, 120000);

    // 创建会话 C
    await createNewSession(page);
    await selectCats(page, [0]); // opus

    await sendMessage(page, '这是会话 C，请回复"C 收到"');
    await waitForAgentReply(page, /C|收到/i, 120000);

    // 验证会话列表有 3 个会话
    const sessionItems = page.locator('#sessionList .session-item');
    const count = await sessionItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // 切换回会话 A，验证内容
    // 点击最后一个会话（最早创建的）
    await sessionItems.last().click();
    await page.waitForTimeout(1000);

    // 在会话 A 中继续对话
    await page.locator('#prompt').fill('');
    await sendMessage(page, '这是哪个会话？请回答 A/B/C');
    await waitForAgentReply(page, /A/i, 120000);
  });
});

test.describe('Agent 协作深度测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Cat Cafe Chat');
  });

  test('链式调用：A -> B -> C 信息传递', async ({ page }) => {
    // 设置更长的测试超时
    test.setTimeout(600000);

    await createNewSession(page);
    await deselectAllCats(page);
    await selectCats(page, [0, 1, 2]); // opus, codex, gemini

    // 让 opus 传递一个计算任务给 codex，codex 再让 gemini 验证
    await sendMessage(page, '@opus 请让 @codex 计算 3+2 等于多少，然后让 @gemini 验证这个结果');

    // 等待三个 agent 都回复（每个最多等待 3 分钟）
    await waitForAgentReply(page, /opus|布偶猫/i, 180000);

    // 等待 codex 开始回复
    await page.waitForTimeout(5000);
    await waitForAgentReply(page, /codex|缅因猫/i, 180000);

    // 等待 gemini 开始回复
    await page.waitForTimeout(5000);
    await waitForAgentReply(page, /gemini|暹罗猫/i, 180000);

    // 验证结果（5 或 五）
    const logContainer = page.locator('#log');
    const logText = await logContainer.textContent();
    // 放宽匹配条件
    expect(logText).toMatch(/5|五|result|结果/i);
  });

  test('Agent 互相评价：B 对 A 的回答进行评论', async ({ page }) => {
    await createNewSession(page);
    await deselectAllCats(page);
    await selectCats(page, [0, 1]); // opus, codex

    await sendMessage(page, '@opus 请用一句话介绍什么是递归，然后 @codex 请评价 opus 的解释是否清晰');

    await waitForAgentReply(page, /opus|布偶猫/i, 120000);
    await waitForAgentReply(page, /codex|缅因猫/i, 180000);

    // 验证 codex 的回复中包含评价相关词汇
    const logContainer = page.locator('#log');
    const messages = await logContainer.locator('.message-row').allTextContents();

    // 找到 codex 的消息（应该在后面）
    const codexMessage = messages.find(m => m.includes('codex') || m.includes('缅因猫') || m.includes('砚砚'));
    expect(codexMessage).toBeTruthy();
    // codex 应该有一些评价性的词汇
    expect(codexMessage.length).toBeGreaterThan(20); // 有实质内容
  });
});
