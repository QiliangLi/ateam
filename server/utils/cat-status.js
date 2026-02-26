/**
 * 猫猫状态管理器
 *
 * 功能：
 * - 管理每只猫的工作状态（空闲/思考中/工具调用/回复中）
 * - 追踪 token 消耗和剩余预算
 * - 提供状态变更事件
 */

const EventEmitter = require('events');
const { listCatIds } = require('../config/cats');

// 状态常量
const CAT_STATUS = {
  IDLE: 'idle',           // 空闲
  THINKING: 'thinking',   // 思考中
  TOOL_CALL: 'tool_call', // 工具调用
  REPLYING: 'replying'    // 回复中
};

// 默认预算（tokens）
const DEFAULT_BUDGETS = {
  opus: 150000,
  codex: 80000,
  gemini: 150000
};

/**
 * 猫猫状态管理器
 */
class CatStatusManager extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} options.budgets - 各猫猫的 token 预算
   */
  constructor(options = {}) {
    super();
    this.budgets = options.budgets || { ...DEFAULT_BUDGETS };
    this.statuses = {};
    this.tokenUsage = {};

    // 初始化所有猫的状态
    for (const catId of listCatIds()) {
      this.statuses[catId] = CAT_STATUS.IDLE;
      this.tokenUsage[catId] = { input: 0, output: 0 };
    }
  }

  /**
   * 获取猫猫状态
   * @param {string} catId - 猫猫 ID
   * @returns {string} - 状态
   */
  getStatus(catId) {
    return this.statuses[catId] || CAT_STATUS.IDLE;
  }

  /**
   * 设置猫猫状态
   * @param {string} catId - 猫猫 ID
   * @param {string} status - 新状态
   */
  setStatus(catId, status) {
    const oldStatus = this.statuses[catId];
    if (oldStatus !== status) {
      this.statuses[catId] = status;
      this.emit('statusChange', catId, status, oldStatus);
    }
  }

  /**
   * 重置猫猫状态为空闲
   * @param {string} catId - 猫猫 ID
   */
  resetStatus(catId) {
    this.setStatus(catId, CAT_STATUS.IDLE);
  }

  /**
   * 更新 token 消耗
   * @param {string} catId - 猫猫 ID
   * @param {object} usage - { input, output }
   */
  updateTokenUsage(catId, usage) {
    if (!this.tokenUsage[catId]) {
      this.tokenUsage[catId] = { input: 0, output: 0 };
    }
    this.tokenUsage[catId].input += usage.input || 0;
    this.tokenUsage[catId].output += usage.output || 0;
  }

  /**
   * 获取 token 消耗
   * @param {string} catId - 猫猫 ID
   * @returns {object} - { input, output }
   */
  getTokenUsage(catId) {
    return this.tokenUsage[catId] || { input: 0, output: 0 };
  }

  /**
   * 获取剩余预算
   * @param {string} catId - 猫猫 ID
   * @returns {number} - 剩余 token 数
   */
  getRemainingBudget(catId) {
    const budget = this.budgets[catId] || 0;
    const usage = this.getTokenUsage(catId);
    return Math.max(0, budget - usage.input - usage.output);
  }

  /**
   * 重置 token 消耗（新 session 开始时调用）
   * @param {string} catId - 猫猫 ID
   */
  resetTokenUsage(catId) {
    this.tokenUsage[catId] = { input: 0, output: 0 };
  }

  /**
   * 获取所有猫猫的状态摘要
   * @returns {object}
   */
  getAllStatusSummary() {
    const summary = {};
    for (const catId of listCatIds()) {
      summary[catId] = {
        status: this.getStatus(catId),
        tokenUsage: this.getTokenUsage(catId),
        remainingBudget: this.getRemainingBudget(catId)
      };
    }
    return summary;
  }
}

module.exports = {
  CAT_STATUS,
  CatStatusManager,
  DEFAULT_BUDGETS
};
