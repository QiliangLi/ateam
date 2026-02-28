const statusText = document.getElementById('statusText');
const catsEl = document.getElementById('cats');
const logEl = document.getElementById('log');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const threadInput = document.getElementById('threadId');
const promptInput = document.getElementById('prompt');

let availableCats = [];
let selectedCats = new Set();
let eventSource = null;

// 流式输出：跟踪每个 agent 当前活动的消息
const activeMessages = new Map(); // catId -> { element, contentEl, isThinking }

function formatTime(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function appendMessage({ text, label, direction = 'left', kind = 'agent' }) {
  const row = document.createElement('article');
  row.className = `message-row ${direction === 'right' ? 'right' : ''} ${kind === 'system' ? 'system' : ''}`.trim();

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const meta = document.createElement('div');
  meta.className = 'bubble-meta';

  const author = document.createElement('span');
  author.textContent = label;

  const time = document.createElement('span');
  time.textContent = formatTime();

  const content = document.createElement('div');
  content.className = 'bubble-content';
  content.textContent = text;

  meta.appendChild(author);
  meta.appendChild(time);
  bubble.appendChild(meta);
  bubble.appendChild(content);
  row.appendChild(bubble);

  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;

  return { row, content };
}

// 确保 agent 有消息元素，没有则创建"正在思考..."占位符
function ensureMessage(catId) {
  if (!activeMessages.has(catId)) {
    const label = catId;
    const { row, content } = appendMessage({
      text: `${catId} 正在思考...`,
      label,
      direction: 'left',
      kind: 'agent'
    });
    activeMessages.set(catId, { row, content, isThinking: true, fullText: '' });
  }
  return activeMessages.get(catId);
}

// 追加 chunk 到 agent 的消息中
function appendChunk(catId, text) {
  const entry = ensureMessage(catId);
  entry.fullText += text;

  if (entry.isThinking) {
    // 移除占位符，显示实际内容
    entry.content.textContent = text;
    entry.isThinking = false;
  } else {
    // 追加到已有内容
    entry.content.textContent = entry.fullText;
  }

  // 滚动到底部
  logEl.scrollTop = logEl.scrollHeight;
}

// agent 完成后重置，下次输出创建新消息
function resetMessage(catId) {
  activeMessages.delete(catId);
}

// 清空所有活动消息（用于新一轮对话）
function clearActiveMessages() {
  activeMessages.clear();
}

function renderCats() {
  catsEl.innerHTML = '';
  availableCats.forEach((catId) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'cat-pill';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = catId;
    checkbox.checked = selectedCats.has(catId);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedCats.add(catId);
        return;
      }
      selectedCats.delete(catId);
    });

    const text = document.createElement('span');
    text.textContent = catId;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    catsEl.appendChild(wrapper);
  });
}

function connectStream(threadId) {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`/api/stream?threadId=${encodeURIComponent(threadId)}`);
  eventSource.onopen = () => {
    statusText.textContent = `已连接 · ${threadId}`;
  };
  eventSource.onerror = () => {
    statusText.textContent = '连接中断，自动重试…';
  };
  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === 'cli') {
      // 流式输出：追加到 agent 的消息中
      appendChunk(payload.catId, payload.text);
      return;
    }

    if (payload.type === 'message') {
      // 显式消息：只重置状态，不追加内容（cli 已经显示了完整内容）
      // 这里的 message 是 agent 通过 CAT_CAFE_POST_MESSAGE 发送的
      // 如果 cli 已经显示了相同内容，则跳过
      const entry = activeMessages.get(payload.catId);
      if (entry && entry.fullText && entry.fullText.includes(payload.content)) {
        // 内容已经通过 cli 显示，只重置状态
        resetMessage(payload.catId);
      } else {
        // 新内容，追加并重置
        appendChunk(payload.catId, payload.content);
        resetMessage(payload.catId);
      }
      return;
    }

    if (payload.type === 'system') {
      // 系统消息：检查是否执行完成
      if (payload.message && payload.message.includes('执行完成')) {
        // 执行完成，重置所有活动消息
        clearActiveMessages();
      }
      appendMessage({
        text: payload.message,
        label: 'System',
        direction: 'left',
        kind: 'system'
      });
    }
  };
}

async function bootstrap() {
  const res = await fetch('/api/bootstrap');
  const data = await res.json();
  availableCats = data.cats || [];
  selectedCats = new Set(availableCats);
  renderCats();
  connectStream(threadInput.value || 'default');
}

// 从 prompt 中提取 @ 提及的 agent
function extractMentionedCats(prompt) {
  const allCats = ['opus', 'codex', 'gemini'];
  const mentioned = [];
  const regex = /@(\w+)/gi;
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    const catId = match[1].toLowerCase();
    if (allCats.includes(catId) && !mentioned.includes(catId)) {
      mentioned.push(catId);
    }
  }
  return mentioned;
}

runBtn.addEventListener('click', async () => {
  const threadId = threadInput.value.trim() || 'default';

  // 清空上一轮的活动消息
  clearActiveMessages();

  connectStream(threadId);

  const prompt = promptInput.value.trim();
  if (!prompt) {
    appendMessage({ text: '请输入 prompt。', label: 'System', kind: 'system' });
    return;
  }

  // 从 prompt 中提取 @ 提及的 agent，如果没有则使用选中的 agent
  const mentionedCats = extractMentionedCats(prompt);
  const cats = mentionedCats.length > 0 ? mentionedCats : Array.from(selectedCats);

  if (cats.length === 0) {
    appendMessage({ text: '请至少选择一只猫或在 prompt 中 @ 指定。', label: 'System', kind: 'system' });
    return;
  }

  appendMessage({
    text: prompt,
    label: 'You',
    direction: 'right',
    kind: 'user'
  });

  promptInput.value = '';

  // 立即为要执行的 agent 创建 "正在思考..." 占位符
  cats.forEach(catId => ensureMessage(catId));

  await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, cats, prompt })
  });
});

clearBtn.addEventListener('click', () => {
  logEl.innerHTML = '';
  clearActiveMessages();
});

threadInput.addEventListener('change', () => {
  connectStream(threadInput.value.trim() || 'default');
});

bootstrap().catch((err) => {
  statusText.textContent = '初始化失败';
  appendMessage({ text: err.message, label: 'System', kind: 'system' });
});
