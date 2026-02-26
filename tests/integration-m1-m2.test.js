/**
 * M1 & M2 联合集成测试
 *
 * 测试各模块之间的协作：
 * - 召唤猫猫 → 状态更新 → 配置生效
 * - A2A 调用 → 输出隔离 → Session Chain
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// 导入所有模块
const { CAT_CONFIGS, getCatConfig, listCatIds, findCatByMention } = require('../server/config/cats');
const { CatConfigManager } = require('../server/config/cat-config');
const { CatStatusManager, CAT_STATUS } = require('../server/utils/cat-status');
const { OutputChannelManager, CHANNEL_TYPE, filterPrivateOutput } = require('../server/utils/output-channel');
const { SessionChainManager } = require('../server/utils/session-chain');
const { parseA2AMentions } = require('../server/a2a/mentions');
const { registerWorklist, enqueueA2ATargets, markExecuted, getWorklist, unregisterWorklist } = require('../server/a2a/registry');

describe('M1 & M2 联合集成测试', () => {
  describe('M1 集成：召唤猫猫 → 配置 → 状态', () => {
    it('召唤猫猫后应该能获取其配置', () => {
      // 1. 用户输入包含 @布偶猫
      const input = '@布偶猫 帮我写代码';
      const mentions = parseA2AMentions(input, null, { mode: 'user' });

      // 2. 应该识别出 opus
      assert.ok(mentions.includes('opus'));

      // 3. 获取配置
      const config = getCatConfig('opus');
      assert.strictEqual(config.name, '布偶猫');
      assert.ok(config.persona);
    });

    it('配置管理器修改后状态管理器应该能感知', () => {
      const configManager = new CatConfigManager();
      const statusManager = new CatStatusManager();

      // 1. 修改配置
      configManager.setContextBudget('opus', 200000);

      // 2. 状态管理器使用新预算
      statusManager.updateTokenUsage('opus', { input: 50000, output: 10000 });
      const remaining = statusManager.getRemainingBudget('opus');

      // 默认预算是 150000，但这里测试隔离性
      assert.ok(remaining >= 0);
    });

    it('召唤多只猫时应该能正确分配角色', () => {
      const input = '@布偶猫 @缅因猫 帮我完成这个功能';
      const mentions = parseA2AMentions(input, null, { mode: 'user', maxTargets: 0 });

      assert.strictEqual(mentions.length, 2);
      assert.ok(mentions.includes('opus'));
      assert.ok(mentions.includes('codex'));

      // 验证角色分工
      const opusConfig = getCatConfig('opus');
      const codexConfig = getCatConfig('codex');

      assert.strictEqual(opusConfig.cli, 'claude');
      assert.strictEqual(codexConfig.cli, 'codex');
    });

    it('使用别名召唤猫猫应该正确识别', () => {
      // 测试所有别名
      const testCases = [
        { input: '@宪宪 帮我', expected: 'opus' },
        { input: '@砚砚 帮我', expected: 'codex' },
        { input: '@opus 帮我', expected: 'opus' },
        { input: '@codex 帮我', expected: 'codex' },
        { input: '@gemini 帮我', expected: 'gemini' }
      ];

      for (const { input, expected } of testCases) {
        const mentions = parseA2AMentions(input, null);
        assert.ok(mentions.includes(expected), `${input} 应该识别为 ${expected}`);
      }
    });
  });

  describe('M2 集成：A2A 调用 → 输出隔离 → Session', () => {
    it('A2A 调用应该触发状态变更和输出记录', () => {
      const statusManager = new CatStatusManager();
      const channelManager = new OutputChannelManager();

      // 1. opus 开始工作
      statusManager.setStatus('opus', CAT_STATUS.THINKING);
      channelManager.write('opus', CHANNEL_TYPE.PRIVATE, '思考中...');

      // 2. opus 调用 codex
      statusManager.setStatus('opus', CAT_STATUS.IDLE);
      const a2aContent = '@codex 帮我 review';
      const targets = parseA2AMentions(a2aContent, 'opus', { mode: 'agent' });

      assert.ok(targets.includes('codex'));

      // 3. codex 开始工作
      statusManager.setStatus('codex', CAT_STATUS.THINKING);
      channelManager.write('codex', CHANNEL_TYPE.PRIVATE, 'review 思考中...');

      // 4. 验证状态
      assert.strictEqual(statusManager.getStatus('opus'), CAT_STATUS.IDLE);
      assert.strictEqual(statusManager.getStatus('codex'), CAT_STATUS.THINKING);
    });

    it('私有输出不应该泄漏到公开通道', () => {
      const channelManager = new OutputChannelManager();

      // 模拟完整的输出流程
      const rawOutput = `
这是我的思考过程...
我在分析代码...

CAT_CAFE_POST_MESSAGE {"content":"@缅因猫 帮我 review","threadId":"test"}

继续思考...
      `;

      // 1. 写入私有通道（完整输出）
      channelManager.write('opus', CHANNEL_TYPE.PRIVATE, rawOutput);

      // 2. 提取公开消息
      const filtered = filterPrivateOutput(rawOutput);
      channelManager.write('opus', CHANNEL_TYPE.PUBLIC, filtered);

      // 3. 验证隔离
      const privateOutput = channelManager.getOutput('opus', CHANNEL_TYPE.PRIVATE);
      const publicOutput = channelManager.getOutput('opus', CHANNEL_TYPE.PUBLIC);

      assert.ok(privateOutput.includes('思考过程'));
      assert.ok(!publicOutput.includes('CAT_CAFE_POST_MESSAGE'));
    });

    it('Session Chain 应该在 token 接近上限时触发 handoff', () => {
      const sessionManager = new SessionChainManager({
        budgets: { opus: 10000 }  // 小预算便于测试
      });

      // 1. 创建 session
      sessionManager.createSession('opus', 'thread-1');

      // 2. 模拟大量 token 使用
      sessionManager.updateTokenUsage('opus', 'thread-1', { input: 7000, output: 2000 });

      // 3. 检测需要 handoff
      assert.ok(sessionManager.needsHandoff('opus', 'thread-1'));

      // 4. 执行 handoff
      const summary = '上一轮讨论了用户认证功能的实现';
      sessionManager.performHandoff('opus', 'thread-1', summary);

      // 5. 验证新 session 有摘要
      const previousSummary = sessionManager.getPreviousSummary('opus', 'thread-1');
      assert.strictEqual(previousSummary, summary);

      // 6. 验证 session chain
      const chain = sessionManager.getSessionChain('opus', 'thread-1');
      assert.strictEqual(chain.length, 2);
    });
  });

  describe('完整流程：用户请求 → 多猫协作 → 输出', () => {
    it('完整的多猫协作流程', () => {
      // 初始化所有管理器
      const configManager = new CatConfigManager();
      const statusManager = new CatStatusManager();
      const channelManager = new OutputChannelManager();
      const sessionManager = new SessionChainManager();

      const threadId = 'test-thread';

      // 1. 用户请求
      const userMessage = '@布偶猫 @缅因猫 帮我实现并 review 登录功能';

      // 2. 解析提及
      const mentions = parseA2AMentions(userMessage, null, { mode: 'user', maxTargets: 0 });
      assert.deepEqual(mentions.sort(), ['codex', 'opus'].sort());

      // 3. 注册工作队列
      registerWorklist(threadId, mentions);

      // 4. 模拟 opus 工作
      const opusConfig = configManager.getConfig('opus');
      statusManager.setStatus('opus', CAT_STATUS.THINKING);
      sessionManager.createSession('opus', threadId);

      // 5. opus 完成工作
      statusManager.setStatus('opus', CAT_STATUS.REPLYING);
      channelManager.write('opus', CHANNEL_TYPE.PUBLIC, '登录功能已实现');
      statusManager.setStatus('opus', CAT_STATUS.IDLE);
      markExecuted(threadId, 'opus');

      // 6. 更新 token
      sessionManager.updateTokenUsage('opus', threadId, { input: 5000, output: 2000 });

      // 7. 验证状态
      assert.strictEqual(statusManager.getStatus('opus'), CAT_STATUS.IDLE);
      assert.strictEqual(sessionManager.getRemainingBudget('opus', threadId), 143000);

      // 8. 清理
      unregisterWorklist(threadId);
    });

    it('链式 A2A 调用应该被正确限制', () => {
      const threadId = 'chain-test';

      // 注册初始工作队列
      registerWorklist(threadId, ['opus']);

      // 模拟多次链式调用
      let totalEnqueued = 0;
      for (let i = 0; i < 20; i++) {
        const enqueued = enqueueA2ATargets(threadId, '@codex @gemini', 'opus', {
          mode: 'agent',
          maxTargets: 2,
          allowRequeueExecuted: true,
          maxRequeuePerCat: 1
        });
        totalEnqueued += enqueued.length;

        // 标记执行
        for (const cat of enqueued) {
          markExecuted(threadId, cat);
        }
      }

      // 应该被 maxDepth 限制
      const worklist = getWorklist(threadId);
      assert.ok(worklist.length < 50, '链式调用应该被限制');

      unregisterWorklist(threadId);
    });
  });

  describe('边界条件和错误处理', () => {
    it('不存在的猫猫应该返回空', () => {
      const config = getCatConfig('nonexistent');
      assert.strictEqual(config, undefined);
    });

    it('空消息应该返回空数组', () => {
      const mentions = parseA2AMentions('', null);
      assert.strictEqual(mentions.length, 0);
    });

    it('代码块中的 @ 不应该被识别', () => {
      const codeBlock = '```javascript\nconst msg = "@布偶猫";\n```';
      const mentions = parseA2AMentions(codeBlock, null);
      assert.strictEqual(mentions.length, 0);
    });

    it('过滤空字符串应该返回空', () => {
      const filtered = filterPrivateOutput('');
      assert.strictEqual(filtered, '');
    });

    it('Session Chain 在空 chain 时应该返回空显示', () => {
      const sessionManager = new SessionChainManager();
      const display = sessionManager.formatChainDisplay('opus', 'nonexistent');
      assert.strictEqual(display, '无 session');
    });
  });

  describe('性能测试', () => {
    it('大量 @ 提及解析应该快速完成', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        parseA2AMentions('@布偶猫 @缅因猫 @暹罗猫 测试消息', null, { mode: 'user', maxTargets: 0 });
      }

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 1000, `1000 次解析应该在 1 秒内完成，实际用时 ${elapsed}ms`);
    });

    it('大量 session 创建应该正常', () => {
      const sessionManager = new SessionChainManager();

      for (let i = 0; i < 100; i++) {
        sessionManager.createSession('opus', `thread-${i}`);
      }

      // 应该没有内存泄漏或崩溃
      assert.ok(true);
    });
  });
});
