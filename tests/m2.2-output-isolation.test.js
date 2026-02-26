/**
 * M2.2 A2A 输出隔离 - 测试用例
 *
 * 功能需求：
 * - CLI stdout/stderr 是内部通道（私有）
 * - MCP callback 是公开通道
 * - 只有 post_message 发送的内容才出现在聊天室
 * - thinking、工具调用日志是私有的
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('M2.2 A2A 输出隔离', () => {
  describe('输出通道管理', () => {
    it('应该区分私有通道和公开通道', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      assert.strictEqual(CHANNEL_TYPE.PRIVATE, 'private');
      assert.strictEqual(CHANNEL_TYPE.PUBLIC, 'public');
    });

    it('应该能写入私有通道', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      manager.write('opus', CHANNEL_TYPE.PRIVATE, '这是思考过程...');
      const privateOutput = manager.getOutput('opus', CHANNEL_TYPE.PRIVATE);
      assert.ok(privateOutput.includes('这是思考过程'));
    });

    it('应该能写入公开通道', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      manager.write('opus', CHANNEL_TYPE.PUBLIC, '这是公开消息');
      const publicOutput = manager.getOutput('opus', CHANNEL_TYPE.PUBLIC);
      assert.ok(publicOutput.includes('这是公开消息'));
    });

    it('私有输出不应该出现在公开输出中', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      manager.write('opus', CHANNEL_TYPE.PRIVATE, '私有思考');
      manager.write('opus', CHANNEL_TYPE.PUBLIC, '公开消息');

      const publicOutput = manager.getOutput('opus', CHANNEL_TYPE.PUBLIC);
      assert.ok(!publicOutput.includes('私有思考'));
    });
  });

  describe('输出过滤器', () => {
    it('应该能过滤掉 callback marker', () => {
      const { filterPrivateOutput } = require('../server/utils/output-channel');

      const raw = '回复内容\nCAT_CAFE_POST_MESSAGE {"content":"@codex"}\n继续回复';
      const filtered = filterPrivateOutput(raw);

      assert.ok(!filtered.includes('CAT_CAFE_POST_MESSAGE'));
    });

    it('应该保留正常的输出内容', () => {
      const { filterPrivateOutput } = require('../server/utils/output-channel');

      const raw = '这是正常的回复内容';
      const filtered = filterPrivateOutput(raw);

      assert.strictEqual(filtered, raw);
    });
  });

  describe('会话隔离', () => {
    it('不同猫猫的输出应该隔离', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      manager.write('opus', CHANNEL_TYPE.PRIVATE, 'opus 的思考');
      manager.write('codex', CHANNEL_TYPE.PRIVATE, 'codex 的思考');

      const opusOutput = manager.getOutput('opus', CHANNEL_TYPE.PRIVATE);
      const codexOutput = manager.getOutput('codex', CHANNEL_TYPE.PRIVATE);

      assert.ok(opusOutput.includes('opus 的思考'));
      assert.ok(!opusOutput.includes('codex 的思考'));
      assert.ok(codexOutput.includes('codex 的思考'));
    });

    it('应该能清除指定猫的输出', () => {
      const { OutputChannelManager, CHANNEL_TYPE } = require('../server/utils/output-channel');
      const manager = new OutputChannelManager();

      manager.write('opus', CHANNEL_TYPE.PRIVATE, '一些输出');
      manager.clear('opus');
      const output = manager.getOutput('opus', CHANNEL_TYPE.PRIVATE);
      assert.strictEqual(output, '');
    });
  });
});
