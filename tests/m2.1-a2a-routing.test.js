/**
 * M2.1 A2A 调用 - 测试用例
 *
 * 功能需求：
 * - 猫猫可以互相 @ 对方
 * - 消息自动路由到被 @ 的猫
 * - 支持链式调用：A @ B @ C
 * - 每次调用都有完整的上下文传递
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('M2.1 A2A 调用', () => {
  describe('A2A 注册中心', () => {
    it('应该能注册工作队列', () => {
      const { registerWorklist, unregisterWorklist, getWorklist } = require('../server/a2a/registry');
      registerWorklist('test-thread', ['opus', 'codex']);
      const worklist = getWorklist('test-thread');
      assert.ok(Array.isArray(worklist));
      unregisterWorklist('test-thread');
    });

    it('应该能将猫猫加入工作队列', () => {
      const { registerWorklist, enqueueA2ATargets, getWorklist, unregisterWorklist } = require('../server/a2a/registry');
      registerWorklist('test-thread-2', ['opus']);

      // 模拟 codex 被 @
      const enqueued = enqueueA2ATargets('test-thread-2', '@codex 帮我 review', 'opus');
      assert.ok(enqueued.includes('codex'));

      unregisterWorklist('test-thread-2');
    });

    it('应该能标记猫猫已执行', () => {
      const { registerWorklist, markExecuted, enqueueA2ATargets, unregisterWorklist } = require('../server/a2a/registry');
      registerWorklist('test-thread-3', ['opus']);
      enqueueA2ATargets('test-thread-3', '@codex', 'opus');
      markExecuted('test-thread-3', 'codex');
      unregisterWorklist('test-thread-3');
    });

    it('应该限制链式调用深度', () => {
      const { registerWorklist, enqueueA2ATargets, getWorklist, unregisterWorklist } = require('../server/a2a/registry');
      registerWorklist('test-thread-4', ['opus']);

      // 模拟多次 @，应该受 maxDepth 限制
      for (let i = 0; i < 20; i++) {
        enqueueA2ATargets('test-thread-4', '@codex', 'opus', { maxRequeuePerCat: 10 });
      }

      const worklist = getWorklist('test-thread-4');
      // 应该被 maxDepth 限制
      assert.ok(worklist.length < 20);

      unregisterWorklist('test-thread-4');
    });
  });

  describe('回调消息提取', () => {
    it('应该能提取回调消息', () => {
      const { extractCallbackMessages } = require('../server/a2a/router');

      const text = '这是回复\nCAT_CAFE_POST_MESSAGE {"content":"@codex 帮我 review","threadId":"test"}';
      const result = extractCallbackMessages(text);

      assert.strictEqual(result.messages.length, 1);
      assert.strictEqual(result.messages[0].content, '@codex 帮我 review');
    });

    it('应该能过滤回调输出', () => {
      const { filterCallbackOutput } = require('../server/a2a/router');

      const chunk = '这是回复\nCAT_CAFE_POST_MESSAGE {"content":"@codex"}\n继续回复';
      const filtered = filterCallbackOutput(chunk);

      assert.ok(!filtered.includes('CAT_CAFE_POST_MESSAGE'));
    });
  });

  describe('A2A 指令构建', () => {
    it('应该能构建 A2A 提及指令', () => {
      const { buildA2AMentionInstructions } = require('../server/a2a/router');

      const instructions = buildA2AMentionInstructions();
      assert.ok(instructions.includes('@opus'));
      assert.ok(instructions.includes('@codex'));
      assert.ok(instructions.includes('@gemini'));
    });
  });
});
