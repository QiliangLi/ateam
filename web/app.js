const statusText = document.getElementById('statusText');
const catsEl = document.getElementById('cats');
const logEl = document.getElementById('log');
const runBtn = document.getElementById('runBtn');
const clearBtn = document.getElementById('clearBtn');
const threadInput = document.getElementById('threadId');
const promptInput = document.getElementById('prompt');
const sessionList = document.getElementById('sessionList');
const sessionSearch = document.getElementById('sessionSearch');
const newSessionBtn = document.getElementById('newSessionBtn');

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

  // 保存消息到会话（非系统消息）
  if (kind !== 'system' && window.SessionManager) {
    const role = direction === 'right' ? 'user' : label;
    window.SessionManager.addMessage(role, text);
  }

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

// 更新 agent 状态（实时显示后端在做什么）
function updateStatus(catId, status, detail) {
  // 获取已有的消息元素（前端已创建占位符）
  const entry = activeMessages.get(catId);
  if (!entry) return; // 没有 agent 的消息元素，跳过
  if (!entry.isThinking) return; // 已经开始输出内容了，不再更新状态

  // 状态文本映射
  const statusTexts = {
    'preparing': '📝 准备中',
    'fetching_context': '📚 获取对话历史',
    'invoking': '🤔 正在思考...'
  };

  const statusText = statusTexts[status] || `⏳ ${status}`;
  const fullText = detail ? `${statusText}\n${detail}` : statusText;

  entry.content.textContent = fullText;
  entry.content.style.color = '#888';
  entry.content.style.fontStyle = 'italic';

  // 滚动到底部
  logEl.scrollTop = logEl.scrollHeight;
}

// agent 完成后重置，下次输出创建新消息
function resetMessage(catId) {
  const entry = activeMessages.get(catId);
  if (entry) {
    // 恢复正常样式
    entry.content.style.color = '';
    entry.content.style.fontStyle = '';

    // 保存完整消息到会话
    if (entry.fullText && entry.fullText.trim() && window.SessionManager) {
      window.SessionManager.addMessage(catId, entry.fullText.trim());
      // 更新会话列表
      if (typeof renderSessionList === 'function') {
        renderSessionList();
      }
    }
  }
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

    if (payload.type === 'status') {
      // 状态更新：更新 agent 的思考占位符
      updateStatus(payload.catId, payload.status, payload.detail);
      return;
    }

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

// ========== 会话管理 ==========

// 初始化会话管理
async function initSessionManager() {
  // 渲染会话列表
  await renderSessionList();

  // 如果有当前会话，加载消息
  const currentSessionId = await window.SessionManager.getCurrentSessionId();
  if (currentSessionId) {
    const session = await window.SessionManager.getSession(currentSessionId);
    if (session) {
      loadSessionMessages(session);
    }
  }

  // 绑定会话列表事件
  window.HistoryPanel.bindEvents(sessionList, {
    onSwitch: async (sessionId) => {
      const session = await window.SessionManager.switchSession(sessionId);
      if (session) {
        loadSessionMessages(session);
        await renderSessionList();
      }
    },
    onRename: (sessionId) => {
      window.HistoryPanel.startRename(sessionList, sessionId);
    },
    onDelete: async (sessionId) => {
      if (confirm('确定要删除这个会话吗？')) {
        await window.SessionManager.deleteSession(sessionId);
        await renderSessionList();
        // 如果删除的是当前会话，清空消息区域
        const currentId = await window.SessionManager.getCurrentSessionId();
        if (!currentId) {
          logEl.innerHTML = '';
        } else {
          const session = await window.SessionManager.getSession(currentId);
          if (session) loadSessionMessages(session);
        }
      }
    }
  });

  // 新建会话按钮
  newSessionBtn.addEventListener('click', async () => {
    await window.SessionManager.createSession();
    logEl.innerHTML = '';
    clearActiveMessages();
    await renderSessionList();
    promptInput.focus();
  });

  // 搜索框
  sessionSearch.addEventListener('input', async () => {
    const query = sessionSearch.value.trim();
    const sessions = await window.SessionManager.searchSessions(query);
    const currentId = await window.SessionManager.getCurrentSessionId();
    renderSessionListWithFilter(sessions, currentId);
  });
}

// 渲染会话列表
async function renderSessionList() {
  const sessions = await window.SessionManager.getAllSessions();
  const currentId = await window.SessionManager.getCurrentSessionId();
  renderSessionListWithFilter(sessions, currentId);
}

// 渲染过滤后的会话列表
function renderSessionListWithFilter(sessions, currentId) {
  sessionList.innerHTML = '';

  if (sessions.length === 0) {
    sessionList.innerHTML = '<div class="no-sessions">没有匹配的会话</div>';
    return;
  }

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item' + (currentId && session.id === currentId ? ' active' : '');
    item.dataset.sessionId = session.id;

    item.innerHTML = `
      <div class="session-content">
        <div class="session-title">${escapeHtml(session.title || '未命名会话')}</div>
        <div class="session-meta">${session.messageCount || 0} 条消息</div>
      </div>
      <div class="session-actions">
        <button class="session-rename" title="重命名">✏️</button>
        <button class="session-delete" title="删除">🗑️</button>
      </div>
    `;

    sessionList.appendChild(item);
  });
}

// 加载会话消息到界面
function loadSessionMessages(session) {
  logEl.innerHTML = '';
  clearActiveMessages();

  if (!session || !session.messages) return;

  session.messages.forEach(msg => {
    const isUser = msg.role === 'user';
    appendMessage({
      text: msg.content,
      label: isUser ? 'You' : msg.role,
      direction: isUser ? 'right' : 'left',
      kind: isUser ? 'user' : 'agent'
    });
  });
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 保存消息到当前会话
function saveMessageToSession(role, content) {
  if (window.SessionManager) {
    window.SessionManager.addMessage(role, content);
    renderSessionList();
  }
}

// ========== 启动 ==========

bootstrap().catch((err) => {
  statusText.textContent = '初始化失败';
  appendMessage({ text: err.message, label: 'System', kind: 'system' });
});

// 在 bootstrap 完成后初始化会话管理
initSessionManager();
