const { CAT_CONFIGS } = require('../config/cats');

/**
 * 移除代码块中的内容，避免误匹配
 */
function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 解析消息中的 @ 提及
 *
 * @param {string} text - 消息文本
 * @param {string|null} currentCatId - 当前猫猫 ID（不会被包含在结果中）
 * @param {object} options - 选项
 * @param {number} options.maxTargets - 最大目标数量（默认 2，0 表示无限制）
 * @param {string} options.mode - 模式：'agent'（行首匹配）或 'user'（任意位置匹配）
 * @returns {string[]} - 被提及的猫猫 ID 数组
 */
function parseA2AMentions(text, currentCatId, options = {}) {
  const maxTargets = options.maxTargets == null ? 2 : options.maxTargets;
  const mode = options.mode || 'agent';
  if (!text) return [];

  const stripped = stripCodeBlocks(text);
  const found = [];

  for (const [id, config] of Object.entries(CAT_CONFIGS)) {
    // 跳过当前猫
    if (id === currentCatId) continue;

    // 检查所有提及模式
    for (const pattern of config.mentionPatterns) {
      const escaped = escapeRegex(pattern);

      // agent 模式：@ 必须在新行行首（用于猫猫之间的 A2A 调用）
      // user 模式：@ 可以在任意位置（用于用户召唤猫猫）
      const regex = mode === 'agent'
        ? new RegExp(`(^|\\n)\\s*(?:[-*•]|\\d+\\.)?\\s*${escaped}(?=\\s|$)`, 'i')
        : new RegExp(`(^|[^\\w])${escaped}(?=$|[^\\w])`, 'i');

      if (regex.test(stripped)) {
        if (!found.includes(id)) {
          found.push(id);
        }
        break; // 找到一个匹配就跳过这个猫的其他模式
      }
    }

    // 检查是否达到最大目标数（0 表示无限制）
    if (maxTargets > 0 && found.length >= maxTargets) {
      break;
    }
  }

  return found;
}

module.exports = {
  parseA2AMentions,
  stripCodeBlocks,
  escapeRegex
};
