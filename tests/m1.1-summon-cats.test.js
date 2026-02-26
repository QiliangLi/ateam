/**
 * M1.1 召唤猫猫 - 测试用例
 *
 * 功能需求：
 * - 用 @布偶猫/@缅因猫/@暹罗猫 召唤不同的猫猫
 * - 支持别名：@宪宪 = @布偶猫，@砚砚 = @缅因猫
 * - 支持同时 @ 多只猫，它们会并行响应
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// 导入被测模块
const { CAT_CONFIGS, getCatConfig, listCatIds } = require('../server/config/cats');
const { parseA2AMentions } = require('../server/a2a/mentions');

describe('M1.1 召唤猫猫', () => {
  describe('猫猫配置', () => {
    it('应该有三只猫', () => {
      const catIds = listCatIds();
      assert.strictEqual(catIds.length, 3);
      assert.ok(catIds.includes('opus'));
      assert.ok(catIds.includes('codex'));
      assert.ok(catIds.includes('gemini'));
    });

    it('布偶猫应该使用 claude CLI', () => {
      const config = getCatConfig('opus');
      assert.strictEqual(config.cli, 'claude');
      assert.strictEqual(config.name, '布偶猫');
    });

    it('缅因猫应该使用 codex CLI', () => {
      const config = getCatConfig('codex');
      assert.strictEqual(config.cli, 'codex');
      assert.strictEqual(config.name, '缅因猫');
    });

    it('暹罗猫应该使用 gemini CLI', () => {
      const config = getCatConfig('gemini');
      assert.strictEqual(config.cli, 'gemini');
      assert.strictEqual(config.name, '暹罗猫');
    });
  });

  describe('@提及解析', () => {
    it('应该识别 @布偶猫', () => {
      const mentions = parseA2AMentions('@布偶猫 你好', null);
      assert.ok(mentions.includes('opus'));
    });

    it('应该识别 @opus 别名', () => {
      const mentions = parseA2AMentions('@opus 你好', null);
      assert.ok(mentions.includes('opus'));
    });

    it('应该识别 @缅因猫', () => {
      const mentions = parseA2AMentions('@缅因猫 你好', null);
      assert.ok(mentions.includes('codex'));
    });

    it('应该识别 @暹罗猫', () => {
      const mentions = parseA2AMentions('@暹罗猫 你好', null);
      assert.ok(mentions.includes('gemini'));
    });

    it('应该支持同时 @ 多只猫（user 模式）', () => {
      const mentions = parseA2AMentions('@布偶猫 @缅因猫 大家好', null, { mode: 'user', maxTargets: 0 });
      assert.ok(mentions.includes('opus'));
      assert.ok(mentions.includes('codex'));
    });

    it('不应该包含当前猫自己（user 模式）', () => {
      const mentions = parseA2AMentions('@布偶猫 @缅因猫 你好', 'opus', { mode: 'user', maxTargets: 0 });
      assert.ok(!mentions.includes('opus'));
      assert.ok(mentions.includes('codex'));
    });

    it('应该支持别名 @宪宪 = @布偶猫', () => {
      const mentions = parseA2AMentions('@宪宪 你好', null);
      assert.ok(mentions.includes('opus'), '应该识别 @宪宪 为布偶猫');
    });

    it('应该支持别名 @砚砚 = @缅因猫', () => {
      const mentions = parseA2AMentions('@砚砚 你好', null);
      assert.ok(mentions.includes('codex'), '应该识别 @砚砚 为缅因猫');
    });

    it('不应该识别代码块中的 @', () => {
      const mentions = parseA2AMentions('```@布偶猫```', null);
      assert.strictEqual(mentions.length, 0);
    });

    it('空消息应该返回空数组', () => {
      const mentions = parseA2AMentions('', null);
      assert.strictEqual(mentions.length, 0);
    });

    it('没有 @ 的消息应该返回空数组', () => {
      const mentions = parseA2AMentions('大家好', null);
      assert.strictEqual(mentions.length, 0);
    });
  });

  describe('猫猫角色定义', () => {
    it('布偶猫应该有角色描述', () => {
      const config = getCatConfig('opus');
      assert.ok(config.role || config.persona, '布偶猫应该有角色描述');
    });

    it('缅因猫应该有角色描述', () => {
      const config = getCatConfig('codex');
      assert.ok(config.role || config.persona, '缅因猫应该有角色描述');
    });

    it('暹罗猫应该有角色描述', () => {
      const config = getCatConfig('gemini');
      assert.ok(config.role || config.persona, '暹罗猫应该有角色描述');
    });
  });
});
