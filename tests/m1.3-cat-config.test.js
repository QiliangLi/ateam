/**
 * M1.3 猫猫配置 - 测试用例
 *
 * 功能需求：
 * - 模型选择：同一只猫可以切换不同模型变体
 * - Context Budget：每只猫的上下文预算
 * - 人格设定：每只猫的性格和说话风格
 * - 工具权限：哪些工具可用、哪些需要确认
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('M1.3 猫猫配置', () => {
  describe('配置管理器', () => {
    it('应该能获取猫猫的完整配置', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();
      const config = manager.getConfig('opus');

      assert.ok(config.cli);
      assert.ok(config.name);
      assert.ok(config.persona);
      assert.ok(config.contextBudget);
    });

    it('应该能设置猫猫的模型', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setModel('opus', 'claude-opus-4-6');
      const config = manager.getConfig('opus');
      assert.strictEqual(config.model, 'claude-opus-4-6');
    });

    it('应该能设置猫猫的上下文预算', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setContextBudget('opus', 200000);
      const config = manager.getConfig('opus');
      assert.strictEqual(config.contextBudget, 200000);
    });

    it('应该能设置猫猫的人格设定', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      const newPersona = '你是一个测试用的猫猫人格';
      manager.setPersona('opus', newPersona);
      const config = manager.getConfig('opus');
      assert.strictEqual(config.persona, newPersona);
    });

    it('应该有默认的上下文预算', () => {
      const { CatConfigManager, DEFAULT_BUDGETS } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      const opusConfig = manager.getConfig('opus');
      const codexConfig = manager.getConfig('codex');
      const geminiConfig = manager.getConfig('gemini');

      assert.strictEqual(opusConfig.contextBudget, 150000);
      assert.strictEqual(codexConfig.contextBudget, 80000);
      assert.strictEqual(geminiConfig.contextBudget, 150000);
    });
  });

  describe('工具权限', () => {
    it('应该能配置允许的工具列表', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setAllowedTools('opus', ['read', 'write', 'bash']);
      const config = manager.getConfig('opus');
      assert.deepStrictEqual(config.allowedTools, ['read', 'write', 'bash']);
    });

    it('应该能配置需要确认的工具列表', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setConfirmRequiredTools('opus', ['bash', 'write']);
      const config = manager.getConfig('opus');
      assert.deepStrictEqual(config.confirmRequiredTools, ['bash', 'write']);
    });

    it('应该能检查工具是否被允许', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setAllowedTools('opus', ['read', 'write']);
      assert.ok(manager.isToolAllowed('opus', 'read'));
      assert.ok(manager.isToolAllowed('opus', 'write'));
      assert.ok(!manager.isToolAllowed('opus', 'bash'));
    });

    it('应该能检查工具是否需要确认', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setConfirmRequiredTools('opus', ['bash']);
      assert.ok(manager.isToolConfirmRequired('opus', 'bash'));
      assert.ok(!manager.isToolConfirmRequired('opus', 'read'));
    });
  });

  describe('配置持久化', () => {
    it('应该能导出配置', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.setModel('opus', 'claude-opus-4-6');
      const exported = manager.exportConfig('opus');

      assert.ok(exported.model === 'claude-opus-4-6');
    });

    it('应该能导入配置', () => {
      const { CatConfigManager } = require('../server/config/cat-config');
      const manager = new CatConfigManager();

      manager.importConfig('opus', {
        model: 'claude-opus-4-6',
        contextBudget: 200000,
        persona: '测试人格'
      });

      const config = manager.getConfig('opus');
      assert.strictEqual(config.model, 'claude-opus-4-6');
      assert.strictEqual(config.contextBudget, 200000);
      assert.strictEqual(config.persona, '测试人格');
    });
  });
});
