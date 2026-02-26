/**
 * 输出通道管理器
 *
 * 功能：
 * - 管理私有通道（CLI stdout/stderr）和公开通道（MCP callback）
 * - 私有输出不会出现在聊天室
 * - 只有公开通道的内容才会推送给用户
 */

const { listCatIds } = require('../config/cats');

// 通道类型常量
const CHANNEL_TYPE = {
  PRIVATE: 'private',  // 私有通道（thinking、工具调用日志）
  PUBLIC: 'public'     // 公开通道（post_message）
};

// 私有输出的标记（需要过滤掉）
const PRIVATE_MARKERS = [
  'CAT_CAFE_POST_MESSAGE',
  '_CAFE_POST_MESSAGE',
  'CAT\n'
];

/**
 * 过滤私有输出标记
 * @param {string} text - 原始文本
 * @returns {string} - 过滤后的文本
 */
function filterPrivateOutput(text) {
  if (!text) return '';

  let filtered = text;

  // 移除 callback marker 行
  for (const marker of PRIVATE_MARKERS) {
    // 移除包含 marker 的整行
    const lines = filtered.split('\n');
    const kept = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed === 'CAT') return false;
      if (trimmed.includes('CAT_CAFE_POST_MESSAGE')) return false;
      if (trimmed.includes('_CAFE_POST_MESSAGE')) return false;
      return true;
    });
    filtered = kept.join('\n');
  }

  return filtered;
}

/**
 * 输出通道管理器
 */
class OutputChannelManager {
  constructor() {
    // 每只猫的私有和公开输出
    this.outputs = {};

    // 初始化所有猫的输出缓冲区
    for (const catId of listCatIds()) {
      this.outputs[catId] = {
        [CHANNEL_TYPE.PRIVATE]: [],
        [CHANNEL_TYPE.PUBLIC]: []
      };
    }
  }

  /**
   * 写入输出
   * @param {string} catId - 猫猫 ID
   * @param {string} channelType - 通道类型
   * @param {string} content - 输出内容
   */
  write(catId, channelType, content) {
    if (!this.outputs[catId]) {
      this.outputs[catId] = {
        [CHANNEL_TYPE.PRIVATE]: [],
        [CHANNEL_TYPE.PUBLIC]: []
      };
    }

    this.outputs[catId][channelType].push({
      content,
      timestamp: Date.now()
    });
  }

  /**
   * 获取输出
   * @param {string} catId - 猫猫 ID
   * @param {string} channelType - 通道类型
   * @returns {string} - 拼接后的输出内容
   */
  getOutput(catId, channelType) {
    const buffer = this.outputs[catId]?.[channelType];
    if (!buffer || buffer.length === 0) return '';

    return buffer.map(item => item.content).join('');
  }

  /**
   * 获取公开输出（过滤后）
   * @param {string} catId - 猫猫 ID
   * @returns {string}
   */
  getPublicOutputFiltered(catId) {
    const raw = this.getOutput(catId, CHANNEL_TYPE.PUBLIC);
    return filterPrivateOutput(raw);
  }

  /**
   * 清除指定猫的所有输出
   * @param {string} catId - 猫猫 ID
   */
  clear(catId) {
    if (this.outputs[catId]) {
      this.outputs[catId] = {
        [CHANNEL_TYPE.PRIVATE]: [],
        [CHANNEL_TYPE.PUBLIC]: []
      };
    }
  }

  /**
   * 清除指定猫的指定通道输出
   * @param {string} catId - 猫猫 ID
   * @param {string} channelType - 通道类型
   */
  clearChannel(catId, channelType) {
    if (this.outputs[catId]) {
      this.outputs[catId][channelType] = [];
    }
  }

  /**
   * 获取所有猫的公开输出摘要
   * @returns {object}
   */
  getAllPublicSummary() {
    const summary = {};
    for (const catId of listCatIds()) {
      summary[catId] = this.getPublicOutputFiltered(catId);
    }
    return summary;
  }
}

module.exports = {
  OutputChannelManager,
  CHANNEL_TYPE,
  filterPrivateOutput
};
