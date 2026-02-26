/**
 * M1.2 猫猫状态栏 - 测试用例
 *
 * 功能需求：
 * - 实时显示每只猫的工作状态
 * - 状态：思考中 / 工具调用 / 回复中 / 空闲
 * - 显示当前 session 的 token 消耗和剩余预算
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// 状态常量
const CAT_STATUS = {
  IDLE: 'idle',           // 空闲
  THINKING: 'thinking',   // 思考中
  TOOL_CALL: 'tool_call', // 工具调用
  REPLYING: 'replying'    // 回复中
};

describe('M1.2 猫猫状态栏', () => {
  describe('状态管理', () => {
    // 这里需要创建一个状态管理模块
    // 暂时先测试接口设计

    it('应该定义四种状态', () => {
      assert.strictEqual(CAT_STATUS.IDLE, 'idle');
      assert.strictEqual(CAT_STATUS.THINKING, 'thinking');
      assert.strictEqual(CAT_STATUS.TOOL_CALL, 'tool_call');
      assert.strictEqual(CAT_STATUS.REPLYING, 'replying');
    });

    it('状态管理器应该能获取猫猫状态', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();
      const status = manager.getStatus('opus');
      assert.ok(status === CAT_STATUS.IDLE || Object.values(CAT_STATUS).includes(status));
    });

    it('状态管理器应该能设置猫猫状态', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();
      manager.setStatus('opus', CAT_STATUS.THINKING);
      assert.strictEqual(manager.getStatus('opus'), CAT_STATUS.THINKING);
    });

    it('状态管理器应该能重置猫猫状态为空闲', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();
      manager.setStatus('opus', CAT_STATUS.THINKING);
      manager.resetStatus('opus');
      assert.strictEqual(manager.getStatus('opus'), CAT_STATUS.IDLE);
    });
  });

  describe('Token 消耗追踪', () => {
    it('状态管理器应该能记录 token 消耗', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();
      manager.updateTokenUsage('opus', { input: 100, output: 50 });
      const usage = manager.getTokenUsage('opus');
      assert.strictEqual(usage.input, 100);
      assert.strictEqual(usage.output, 50);
    });

    it('状态管理器应该能累计 token 消耗', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();
      manager.updateTokenUsage('opus', { input: 100, output: 50 });
      manager.updateTokenUsage('opus', { input: 50, output: 30 });
      const usage = manager.getTokenUsage('opus');
      assert.strictEqual(usage.input, 150);
      assert.strictEqual(usage.output, 80);
    });

    it('状态管理器应该能获取剩余预算', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager({
        budgets: { opus: 150000, codex: 80000, gemini: 150000 }
      });
      manager.updateTokenUsage('opus', { input: 10000, output: 5000 });
      const remaining = manager.getRemainingBudget('opus');
      assert.strictEqual(remaining, 135000);
    });
  });

  describe('状态事件', () => {
    it('状态变更应该触发事件', () => {
      const { CatStatusManager } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();

      let eventTriggered = false;
      manager.on('statusChange', (catId, newStatus, oldStatus) => {
        assert.strictEqual(catId, 'opus');
        assert.strictEqual(newStatus, CAT_STATUS.THINKING);
        assert.strictEqual(oldStatus, CAT_STATUS.IDLE);
        eventTriggered = true;
      });

      manager.setStatus('opus', CAT_STATUS.THINKING);
      assert.ok(eventTriggered, '事件应该被触发');
    });
  });
});
