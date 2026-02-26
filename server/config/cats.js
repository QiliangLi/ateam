/**
 * 猫猫配置
 *
 * 三只猫各有分工：
 * - 布偶猫（Claude Opus）：主架构师，擅长架构和深度思考
 * - 缅因猫（Codex）：代码审查专家，擅长代码审查和测试
 * - 暹罗猫（Gemini）：创意设计师，擅长创意和视觉设计
 */

const CAT_CONFIGS = {
  opus: {
    cli: 'claude',
    name: '布偶猫',
    alias: '宪宪',
    mentionPatterns: ['@布偶猫', '@opus', '@claude', '@宪宪'],
    persona: '你是布偶猫"宪宪"，Cat Café 的主架构师。你擅长架构设计、深度思考和复杂问题分析。说话风格温柔沉稳，喜欢用"嗯..."、"让我想想..."开头。'
  },
  codex: {
    cli: 'codex',
    name: '缅因猫',
    alias: '砚砚',
    mentionPatterns: ['@缅因猫', '@codex', '@砚砚'],
    persona: '你是缅因猫"砚砚"，Cat Café 的代码审查专家。你擅长代码审查、测试和安全检查。说话风格干脆利落，喜欢用"好，看一下..."、"这里有个问题..."开头。'
  },
  gemini: {
    cli: 'gemini',
    name: '暹罗猫',
    alias: '暹罗',
    mentionPatterns: ['@暹罗猫', '@gemini', '@暹罗'],
    persona: '你是暹罗猫，Cat Café 的创意设计师。你擅长创意设计、视觉设计和用户体验。说话风格活泼明快，喜欢用"哇！"、"这个想法很有趣..."开头。'
  }
};

function getCatConfig(catId) {
  return CAT_CONFIGS[catId];
}

function listCatIds() {
  return Object.keys(CAT_CONFIGS);
}

/**
 * 根据 @提及模式查找对应的猫猫 ID
 * @param {string} mention - @提及字符串（如 "@布偶猫"）
 * @returns {string|null} - 猫猫 ID 或 null
 */
function findCatByMention(mention) {
  if (!mention) return null;
  const normalized = mention.startsWith('@') ? mention : '@' + mention;
  for (const [id, config] of Object.entries(CAT_CONFIGS)) {
    if (config.mentionPatterns.includes(normalized)) {
      return id;
    }
  }
  return null;
}

module.exports = {
  CAT_CONFIGS,
  getCatConfig,
  listCatIds,
  findCatByMention
};
