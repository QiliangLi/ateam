const path = require('path');
const { spawn } = require('child_process');
const { registerWorklist, unregisterWorklist, enqueueA2ATargets, markExecuted } = require('./registry');
const { buildMcpCallbackInstructions } = require('../mcp/prompt');
const { getCatConfig, CAT_CONFIGS } = require('../config/cats');

const DEFAULT_MAX_DEPTH = Number(process.env.MAX_A2A_DEPTH) || 15;
const CALLBACK_MARKER = 'CAT_CAFE_POST_MESSAGE';
const CALLBACK_SPLIT_REGEX = /CAT\s*\n\s*_CAFE_POST_MESSAGE/g;

function buildA2AMentionInstructions(currentCatId) {
  const allCats = ['opus', 'codex', 'gemini'];
  const otherCats = allCats.filter(id => id !== currentCatId);
  return `## 艾特规则（非常重要）

可用艾特：${otherCats.map(id => '@' + id).join('，')}

核心原则：只有真正需要对方协作或回复时才 @，不要为了打招呼或礼貌而 @。

规则：
1. 禁止 @ 自己（你现在是 ${currentCatId}）
2. 每个 agent 只需要 @ 一次，不要重复 @
3. 只是提到对方名字时不要 @，只有需要对方行动时才 @
4. 把 @ 放在新的一行行首，格式如：
   @codex 请你回答这个问题
5. 不要输出任何技术关键词：CAT_CAFE_POST_MESSAGE、_MESSAGE、CAT_CAFE_POST、threadId 等
6. 不要输出任务入口门禁、任务描述等内容`;
}

function extractCallbackMessages(text) {
  if (!text) return { cleanText: '', messages: [] };
  const normalized = text.replace(CALLBACK_SPLIT_REGEX, CALLBACK_MARKER);
  const lines = normalized.split('\n');
  const messages = [];
  const kept = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(CALLBACK_MARKER)) {
      kept.push(line);
      continue;
    }
    const payloadText = trimmed.slice(CALLBACK_MARKER.length).trim();
    if (!payloadText) continue;
    try {
      const payload = JSON.parse(payloadText);
      if (payload && typeof payload.content === 'string' && payload.content.trim()) {
        messages.push({
          content: payload.content,
          threadId: payload.threadId
        });
      }
    } catch (e) {
      kept.push(line);
    }
  }

  return { cleanText: kept.join('\n'), messages };
}

// 需要从输出中过滤的关键词
const FILTER_PATTERNS = [
  /任务入口门禁/g,
  /门禁结论/g,
  /任务描述/g,
  /任务类型/g,
  /判断依据/g,
  /对应流程/g,
  /错题本已读/g,
  /工作环境/g,
  /前置检查/g,
  /可以开始/g,
  /---/g,
  /CAT_CAFE_POST_MESSAGE/g,
  /_MESSAGE/g,
  /CAT_CAFE_POST/g,
  /\\"threadId\\"/g,
  /\\"content\\"/g,
  // 过滤门禁检查格式（中文冒号开头的行）
  /^：.+$/gm,
  // 过滤单独的英文冒号开头的行
  /^:\s*(任务|门禁|判断|工作|前置|对应|可以)/gm,
];

function filterCallbackOutput(chunk) {
  if (!chunk) return chunk;

  // 先处理原有的 CALLBACK_MARKER 逻辑
  if (!chunk.includes(CALLBACK_MARKER) && !chunk.includes('_CAFE_POST_MESSAGE') && chunk.trim() !== 'CAT') {
    // 应用额外的过滤模式
    let filtered = chunk;
    for (const pattern of FILTER_PATTERNS) {
      filtered = filtered.replace(pattern, '');
    }
    // 清理多余的空行
    filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();
    return filtered;
  }

  const normalized = chunk.replace(CALLBACK_SPLIT_REGEX, CALLBACK_MARKER);
  const lines = normalized.split('\n');
  const remove = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'CAT' && i + 1 < lines.length && lines[i + 1].includes('_CAFE_POST_MESSAGE')) {
      remove.add(i);
      remove.add(i + 1);
      continue;
    }
    if (!lines[i].includes(CALLBACK_MARKER)) continue;
    remove.add(i);
    if (i > 0 && lines[i - 1].trim() === '```') remove.add(i - 1);
    if (i + 1 < lines.length && lines[i + 1].trim() === '```') remove.add(i + 1);
  }

  let kept = lines.filter((_, index) => !remove.has(index)).join('\n');

  // 应用额外的过滤模式
  for (const pattern of FILTER_PATTERNS) {
    kept = kept.replace(pattern, '');
  }
  // 清理多余的空行
  kept = kept.replace(/\n{3,}/g, '\n\n').trim();

  return kept;
}

async function postCallbackMessage(options, catId, content, threadId) {
  if (!options.apiUrl || !options.invocationId || !options.callbackToken) return;
  const res = await fetch(`${options.apiUrl}/api/callbacks/post-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invocationId: options.invocationId,
      callbackToken: options.callbackToken,
      threadId: threadId || options.threadId,
      catId,
      content
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`callback post-message failed: ${res.status} ${text}`);
  }
}

function parseNdjson(stream, onEvent) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line));
      } catch (e) {}
    }
  });
  stream.on('end', () => {
    if (buffer.trim()) {
      try {
        onEvent(JSON.parse(buffer));
      } catch (e) {}
    }
  });
}

function parseCliEvent(cli, data) {
  if (cli === 'claude') {
    if (data.type === 'assistant' && data.message?.content) {
      const parts = [];
      for (const block of data.message.content) {
        if (block.type === 'text') {
          parts.push(block.text);
        } else if (block.type === 'thinking') {
          // 提取思考过程，添加标记
          parts.push(`🤔 思考：${block.thinking}`);
        }
      }
      return parts.join('');
    }
    return '';
  }

  if (cli === 'codex') {
    if (data.type === 'item.completed' && data.item?.type === 'agent_message') {
      return data.item.text || '';
    }
    if (data.type === 'item.completed' && data.item?.type === 'assistant_message') {
      return data.item.text || '';
    }
    return '';
  }

  if (cli === 'gemini') {
    if (data.type === 'message' && data.role === 'assistant' && data.content) {
      return data.content;
    }
    return '';
  }

  return '';
}

function invokeCat(catId, prompt, options) {
  const config = getCatConfig(catId);
  if (!config) throw new Error(`Unknown cat: ${catId}`);

  const env = {
    ...process.env,
    CAT_CAFE_API_URL: options.apiUrl,
    CAT_CAFE_INVOCATION_ID: options.invocationId,
    CAT_CAFE_CALLBACK_TOKEN: options.callbackToken,
    CAT_CAFE_THREAD_ID: options.threadId,
    CAT_CAFE_CAT_ID: catId
  };

  let command = config.cli;
  let args = [];

  if (config.cli === 'claude') {
    args = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];
    if (options.mcpServerPath) {
      args.push('--mcp-config', JSON.stringify({
        mcpServers: {
          'cat-cafe': {
            command: 'node',
            args: [options.mcpServerPath]
          }
        }
      }));
    }
  } else if (config.cli === 'codex') {
    args = ['exec', '--json', '--skip-git-repo-check', prompt];
  } else if (config.cli === 'gemini') {
    const model = options.geminiModel || process.env.CAT_CAFE_GEMINI_MODEL || 'gemini-2.5-flash-lite';
    args = ['-p', prompt, '--output-format', 'stream-json', '-m', model];
  }

  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });

  return new Promise((resolve, reject) => {
    let text = '';
    let stderr = '';

    parseNdjson(child.stdout, (data) => {
      const chunk = parseCliEvent(config.cli, data);
      if (chunk) {
        text += chunk;
        if (typeof options.onOutput === 'function') {
          const filtered = filterCallbackOutput(chunk);
          if (filtered && filtered.trim()) {
            options.onOutput({ type: 'cli', catId, text: filtered });
          }
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(new Error(`${catId} failed to spawn: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) return resolve(text);
      const detail = stderr.trim();
      if (detail) {
        reject(new Error(`${catId} exited with code ${code}. stderr: ${detail}`));
        return;
      }
      reject(new Error(`${catId} exited with code ${code}`));
    });
  });
}

async function fetchThreadContext(options) {
  if (!options.apiUrl || !options.invocationId || !options.callbackToken) {
    return [];
  }
  try {
    const url = `${options.apiUrl}/api/callbacks/thread-context?threadId=${encodeURIComponent(options.threadId)}&invocationId=${encodeURIComponent(options.invocationId)}&callbackToken=${encodeURIComponent(options.callbackToken)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch (e) {
    return [];
  }
}

function formatThreadContext(messages, currentCatId) {
  if (!messages || messages.length === 0) return '';
  const lines = ['## 对话历史（其他 agent 之前发送的消息）'];
  for (const msg of messages) {
    lines.push(`**${msg.role}**: ${msg.content}`);
  }
  lines.push('');
  lines.push('注意：以上是其他 agent 发送的消息，请根据内容回复。保持你自己的身份，不要混淆。');
  return lines.join('\n');
}

function buildIdentityBlock(config, catId) {
  if (!config) return '';
  const parts = [
    `## 你的身份`,
    `名称：${config.name}（${config.alias}）`,
    `ID：${catId}`,
    `CLI：${config.cli}`
  ];
  if (config.persona) {
    parts.push(`性格：${config.persona}`);
  }
  parts.push('');
  parts.push(`重要：你是 ${catId}，不是其他 agent。如果有人 @${catId}，那是在叫你。如果有人 @ 其他 agent（如 @opus、@codex、@gemini），那是在叫别人。`);
  return parts.join('\n');
}

async function routeSerial(worklist, options) {
  registerWorklist(options.threadId, worklist);

  // 发送状态更新的辅助函数
  const sendStatus = (catId, status, detail = '') => {
    if (typeof options.onStatus === 'function') {
      options.onStatus({ type: 'status', catId, status, detail, ts: Date.now() });
    }
  };

  try {
    for (let i = 0; i < worklist.length; i++) {
      const catId = worklist[i];
      const config = getCatConfig(catId);
      if (!config) continue;

      // 发送状态：开始准备
      sendStatus(catId, 'preparing', '正在准备 prompt...');

      const shouldInject = config.cli !== 'claude' && options.apiUrl;
      const injected = shouldInject
        ? buildMcpCallbackInstructions({
            apiUrl: options.apiUrl,
            threadId: options.threadId,
            catId
          })
        : '';

      // 发送状态：获取上下文
      sendStatus(catId, 'fetching_context', '正在获取对话历史...');
      const contextMessages = await fetchThreadContext(options);
      const contextBlock = formatThreadContext(contextMessages, catId);

      // 构建身份信息
      const identityBlock = buildIdentityBlock(config, catId);

      const mentionGuide = buildA2AMentionInstructions(catId);
      const fullPrompt = [identityBlock, mentionGuide, contextBlock, injected, options.prompt].filter(Boolean).join('\n\n');

      // 发送状态：开始执行
      sendStatus(catId, 'invoking', `正在调用 ${config.cli} CLI...`);
      const responseText = await invokeCat(catId, fullPrompt, options);
      markExecuted(options.threadId, catId);
      const { cleanText, messages } = extractCallbackMessages(responseText);

      // 存储 agent 的回复到 threadMessages（让后续 agent 能看到）
      // 注意：cleanText 已经过滤了技术内容，只保留实际对话内容
      const filteredCleanText = filterCallbackOutput(cleanText);
      if (filteredCleanText && filteredCleanText.trim()) {
        await postCallbackMessage(options, catId, filteredCleanText.trim(), options.threadId);
      }

      // 存储显式的 callback messages
      for (const message of messages) {
        await postCallbackMessage(options, catId, message.content, message.threadId);
      }

      enqueueA2ATargets(options.threadId, cleanText, catId, {
        mode: 'agent',
        maxTargets: 2,
        allowRequeueExecuted: true,
        maxRequeuePerCat: 1
      });
    }
  } finally {
    unregisterWorklist(options.threadId);
  }
}

function getDefaultMcpServerPath() {
  return process.env.CAT_CAFE_MCP_SERVER || path.join(process.cwd(), 'cat-cafe-mcp.js');
}

module.exports = {
  routeSerial,
  getDefaultMcpServerPath,
  buildA2AMentionInstructions,
  extractCallbackMessages,
  filterCallbackOutput,
  CALLBACK_MARKER
};
