/**
 * 猫猫配置管理器
 *
 * 功能：
 * - 管理每只猫的配置（模型、预算、人格、工具权限）
 * - 支持运行时动态修改配置
 * - 支持配置导入导出
 */

const { listCatIds, CAT_CONFIGS } = require('./cats');

// 默认上下文预算（tokens）
const DEFAULT_BUDGETS = {
  opus: 150000,
  codex: 80000,
  gemini: 150000
};

// 默认模型
const DEFAULT_MODELS = {
  opus: 'claude-opus-4-6',
  codex: 'codex-1',
  gemini: 'gemini-2.0-flash'
};

// 默认允许的工具（空表示允许所有）
const DEFAULT_ALLOWED_TOOLS = [];

// 默认需要确认的工具
const DEFAULT_CONFIRM_TOOLS = {
  opus: ['bash'],
  codex: ['bash', 'write'],
  gemini: ['bash', 'write']
};

/**
 * 猫猫配置管理器
 */
class CatConfigManager {
  constructor() {
    this.configs = {};

    // 初始化所有猫的配置
    for (const catId of listCatIds()) {
      const baseConfig = CAT_CONFIGS[catId];
      this.configs[catId] = {
        cli: baseConfig.cli,
        name: baseConfig.name,
        alias: baseConfig.alias,
        mentionPatterns: [...baseConfig.mentionPatterns],
        persona: baseConfig.persona,
        model: DEFAULT_MODELS[catId],
        contextBudget: DEFAULT_BUDGETS[catId],
        allowedTools: [...DEFAULT_ALLOWED_TOOLS],
        confirmRequiredTools: [...(DEFAULT_CONFIRM_TOOLS[catId] || [])]
      };
    }
  }

  /**
   * 获取猫猫配置
   * @param {string} catId - 猫猫 ID
   * @returns {object}
   */
  getConfig(catId) {
    return this.configs[catId] ? { ...this.configs[catId] } : null;
  }

  /**
   * 设置猫猫模型
   * @param {string} catId - 猫猫 ID
   * @param {string} model - 模型名称
   */
  setModel(catId, model) {
    if (this.configs[catId]) {
      this.configs[catId].model = model;
    }
  }

  /**
   * 设置上下文预算
   * @param {string} catId - 猫猫 ID
   * @param {number} budget - 预算（tokens）
   */
  setContextBudget(catId, budget) {
    if (this.configs[catId]) {
      this.configs[catId].contextBudget = budget;
    }
  }

  /**
   * 设置人格设定
   * @param {string} catId - 猫猫 ID
   * @param {string} persona - 人格描述
   */
  setPersona(catId, persona) {
    if (this.configs[catId]) {
      this.configs[catId].persona = persona;
    }
  }

  /**
   * 设置允许的工具列表
   * @param {string} catId - 猫猫 ID
   * @param {string[]} tools - 工具列表
   */
  setAllowedTools(catId, tools) {
    if (this.configs[catId]) {
      this.configs[catId].allowedTools = [...tools];
    }
  }

  /**
   * 设置需要确认的工具列表
   * @param {string} catId - 猫猫 ID
   * @param {string[]} tools - 工具列表
   */
  setConfirmRequiredTools(catId, tools) {
    if (this.configs[catId]) {
      this.configs[catId].confirmRequiredTools = [...tools];
    }
  }

  /**
   * 检查工具是否被允许
   * @param {string} catId - 猫猫 ID
   * @param {string} toolName - 工具名称
   * @returns {boolean}
   */
  isToolAllowed(catId, toolName) {
    const config = this.configs[catId];
    if (!config) return false;

    // 空列表表示允许所有工具
    if (config.allowedTools.length === 0) return true;

    return config.allowedTools.includes(toolName);
  }

  /**
   * 检查工具是否需要确认
   * @param {string} catId - 猫猫 ID
   * @param {string} toolName - 工具名称
   * @returns {boolean}
   */
  isToolConfirmRequired(catId, toolName) {
    const config = this.configs[catId];
    if (!config) return false;

    return config.confirmRequiredTools.includes(toolName);
  }

  /**
   * 导出配置
   * @param {string} catId - 猫猫 ID
   * @returns {object}
   */
  exportConfig(catId) {
    return this.getConfig(catId);
  }

  /**
   * 导入配置
   * @param {string} catId - 猫猫 ID
   * @param {object} config - 配置对象
   */
  importConfig(catId, config) {
    if (!this.configs[catId]) return;

    const merged = { ...this.configs[catId], ...config };
    this.configs[catId] = merged;
  }

  /**
   * 获取所有猫的配置摘要
   * @returns {object}
   */
  getAllConfigSummary() {
    const summary = {};
    for (const catId of listCatIds()) {
      const config = this.configs[catId];
      summary[catId] = {
        name: config.name,
        model: config.model,
        contextBudget: config.contextBudget
      };
    }
    return summary;
  }
}

module.exports = {
  CatConfigManager,
  DEFAULT_BUDGETS,
  DEFAULT_MODELS
};
