/**
 * Session Chain 管理器
 *
 * 功能：
 * - 管理每只猫的 session 状态
 * - 当 context 接近上限时自动 handoff
 * - 支持 session chain 显示
 * - 新 session 会收到前一个 session 的摘要
 */

const { randomUUID } = require('crypto');
const { listCatIds } = require('../config/cats');

// 默认预算（tokens）
const DEFAULT_BUDGETS = {
  opus: 150000,
  codex: 80000,
  gemini: 150000
};

// 触发 handoff 的阈值（使用量占预算的比例）
const HANDOFF_THRESHOLD = 0.8;

/**
 * Session Chain 管理器
 */
class SessionChainManager {
  /**
   * @param {object} options
   * @param {object} options.budgets - 各猫猫的 token 预算
   */
  constructor(options = {}) {
    this.budgets = options.budgets || { ...DEFAULT_BUDGETS };
    this.threshold = options.threshold || HANDOFF_THRESHOLD;

    // session chains: { [catId]: { [threadId]: SessionChain } }
    this.chains = {};

    // 初始化
    for (const catId of listCatIds()) {
      this.chains[catId] = {};
    }
  }

  /**
   * 创建新 session
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {string} - session ID
   */
  createSession(catId, threadId) {
    if (!this.chains[catId]) {
      this.chains[catId] = {};
    }

    const sessionId = randomUUID();
    const session = {
      sessionId,
      createdAt: Date.now(),
      tokenUsage: { input: 0, output: 0 },
      summary: null
    };

    if (!this.chains[catId][threadId]) {
      this.chains[catId][threadId] = [];
    }

    this.chains[catId][threadId].push(session);
    return sessionId;
  }

  /**
   * 获取当前 session
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {object}
   */
  getCurrentSession(catId, threadId) {
    const chain = this.chains[catId]?.[threadId];
    if (!chain || chain.length === 0) {
      // 自动创建新 session
      this.createSession(catId, threadId);
      return this.chains[catId][threadId][0];
    }
    return chain[chain.length - 1];
  }

  /**
   * 更新 token 使用量
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @param {object} usage - { input, output }
   */
  updateTokenUsage(catId, threadId, usage) {
    const session = this.getCurrentSession(catId, threadId);
    session.tokenUsage.input += usage.input || 0;
    session.tokenUsage.output += usage.output || 0;
  }

  /**
   * 检测是否需要 handoff
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {boolean}
   */
  needsHandoff(catId, threadId) {
    const session = this.getCurrentSession(catId, threadId);
    const budget = this.getBudget(catId);
    const used = session.tokenUsage.input + session.tokenUsage.output;

    return used >= budget * this.threshold;
  }

  /**
   * 执行 handoff
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @param {string} summary - 上一轮摘要
   * @returns {string} - 新 session ID
   */
  performHandoff(catId, threadId, summary) {
    // 为当前 session 设置摘要
    const currentSession = this.getCurrentSession(catId, threadId);
    currentSession.summary = summary;

    // 创建新 session
    const newSessionId = this.createSession(catId, threadId);
    return newSessionId;
  }

  /**
   * 获取上一个 session 的摘要
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {string|null}
   */
  getPreviousSummary(catId, threadId) {
    const chain = this.chains[catId]?.[threadId];
    if (!chain || chain.length < 2) return null;

    return chain[chain.length - 2].summary;
  }

  /**
   * 获取 session chain
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {object[]}
   */
  getSessionChain(catId, threadId) {
    return this.chains[catId]?.[threadId] || [];
  }

  /**
   * 格式化 session chain 显示
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {string}
   */
  formatChainDisplay(catId, threadId) {
    const chain = this.getSessionChain(catId, threadId);
    if (chain.length === 0) return '无 session';

    const parts = chain.map((session, index) => {
      const used = session.tokenUsage.input + session.tokenUsage.output;
      return `Session ${index + 1} (${used} tokens)`;
    });

    return parts.join(' → ');
  }

  /**
   * 获取预算
   * @param {string} catId - 猫猫 ID
   * @returns {number}
   */
  getBudget(catId) {
    return this.budgets[catId] || 150000;
  }

  /**
   * 获取剩余预算
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   * @returns {number}
   */
  getRemainingBudget(catId, threadId) {
    const session = this.getCurrentSession(catId, threadId);
    const budget = this.getBudget(catId);
    const used = session.tokenUsage.input + session.tokenUsage.output;
    return Math.max(0, budget - used);
  }

  /**
   * 清除指定线程的 session chain
   * @param {string} catId - 猫猫 ID
   * @param {string} threadId - 线程 ID
   */
  clearChain(catId, threadId) {
    if (this.chains[catId]) {
      this.chains[catId][threadId] = [];
    }
  }
}

module.exports = {
  SessionChainManager,
  DEFAULT_BUDGETS,
  HANDOFF_THRESHOLD
};
