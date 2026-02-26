/**
 * M2.3 Session Chain - 测试用例
 *
 * 功能需求：
 * - 每只猫有 context 预算（如 opus 150k tokens）
 * - 当使用量接近上限时，自动触发 handoff
 * - 新 session 会收到前一个 session 的摘要
 * - 支持 session chain 显示
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('M2.3 Session Chain', () => {
  describe('Session 管理', () => {
    it('应该能创建新 session', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager();

      const sessionId = manager.createSession('opus', 'thread-1');
      assert.ok(sessionId);
    });

    it('应该能获取当前 session', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager();

      const sessionId = manager.createSession('opus', 'thread-1');
      const current = manager.getCurrentSession('opus', 'thread-1');

      assert.strictEqual(current.sessionId, sessionId);
    });

    it('应该能追踪 token 使用量', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager();

      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 1000, output: 500 });

      const session = manager.getCurrentSession('opus', 'thread-1');
      assert.strictEqual(session.tokenUsage.input, 1000);
      assert.strictEqual(session.tokenUsage.output, 500);
    });
  });

  describe('Session Handoff', () => {
    it('应该能检测是否需要 handoff', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 10000 }  // 小预算便于测试
      });

      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 8000, output: 1500 });

      const needsHandoff = manager.needsHandoff('opus', 'thread-1');
      assert.ok(needsHandoff);
    });

    it('应该能执行 handoff', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 10000 }
      });

      const oldSessionId = manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 8000, output: 1500 });

      const newSessionId = manager.performHandoff('opus', 'thread-1', '这是摘要');

      assert.notStrictEqual(newSessionId, oldSessionId);

      const current = manager.getCurrentSession('opus', 'thread-1');
      assert.strictEqual(current.sessionId, newSessionId);
    });

    it('handoff 后应该能获取摘要', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 10000 }
      });

      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 8000, output: 1500 });
      manager.performHandoff('opus', 'thread-1', '这是上一轮的摘要');

      const summary = manager.getPreviousSummary('opus', 'thread-1');
      assert.strictEqual(summary, '这是上一轮的摘要');
    });
  });

  describe('Session Chain 显示', () => {
    it('应该能获取 session chain', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 1000 }
      });

      // 创建多个 session
      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 800, output: 150 });
      manager.performHandoff('opus', 'thread-1', '摘要1');

      manager.updateTokenUsage('opus', 'thread-1', { input: 800, output: 150 });
      manager.performHandoff('opus', 'thread-1', '摘要2');

      const chain = manager.getSessionChain('opus', 'thread-1');
      assert.ok(chain.length >= 2);
    });

    it('应该能格式化 session chain 显示', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 1000 }
      });

      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 800, output: 150 });
      manager.performHandoff('opus', 'thread-1', '摘要1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 800, output: 150 });
      manager.performHandoff('opus', 'thread-1', '摘要2');

      const display = manager.formatChainDisplay('opus', 'thread-1');
      assert.ok(display.includes('Session'));
    });
  });

  describe('预算管理', () => {
    it('应该有默认预算', () => {
      const { SessionChainManager, DEFAULT_BUDGETS } = require('../server/utils/session-chain');
      const manager = new SessionChainManager();

      assert.ok(manager.getBudget('opus') > 0);
      assert.ok(manager.getBudget('codex') > 0);
      assert.ok(manager.getBudget('gemini') > 0);
    });

    it('应该能获取剩余预算', () => {
      const { SessionChainManager } = require('../server/utils/session-chain');
      const manager = new SessionChainManager({
        budgets: { opus: 10000 }
      });

      manager.createSession('opus', 'thread-1');
      manager.updateTokenUsage('opus', 'thread-1', { input: 2000, output: 500 });

      const remaining = manager.getRemainingBudget('opus', 'thread-1');
      assert.strictEqual(remaining, 7500);
    });
  });
});
