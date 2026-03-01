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
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const historyPanel = document.querySelector('.history-panel');

let availableCats = [];
let selectedCats = new Set();
let eventSource = null;
let currentSessionId = null; // 当前会话 ID

// 切换侧边栏
if (toggleSidebarBtn && historyPanel) {
  toggleSidebarBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('collapsed');
  });
}

// 流式输出：跟踪每个 agent 当前活动的消息
const activeMessages = new Map(); // catId -> { element, contentEl, isThinking }

function formatTime(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 获取头像 emoji
function getAvatarEmoji(label) {
  const avatars = {
    'opus': '🐱',
    'codex': '🐈',
    'gemini': '😺',
    'You': '👤',
    'System': '⚙️'
  };
  return avatars[label] || '💬';
}

function appendMessage({ text, label, direction = 'left', kind = 'agent', save = true }) {
  const row = document.createElement('article');
  row.className = `message-row ${direction === 'right' ? 'right' : ''} ${kind === 'system' ? 'system' : ''}`.trim();

  // 创建头像（非系统消息）
  if (kind !== 'system') {
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = getAvatarEmoji(label);
    row.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const meta = document.createElement('div');
  meta.className = 'bubble-meta';

  const author = document.createElement('span');
  author.className = 'bubble-author';
  author.textContent = label;

  const time = document.createElement('span');
  time.className = 'bubble-time';
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

  // 保存消息到当前会话（非系统消息，且 save=true）
  if (save && kind !== 'system' && window.SessionManager && currentSessionId) {
    const role = direction === 'right' ? 'user' : label;
    window.SessionManager.addMessage(currentSessionId, role, text);
  }

  return { row, content };
}

// 确保 agent 有消息元素，没有则创建"正在思考..."占位符
function ensureMessage(catId) {
  if (!activeMessages.has(catId)) {
    const label = catId;
    const { row, content } = appendMessage({
      text: '',  // 初始为空，由状态指示器显示
      label,
      direction: 'left',
      kind: 'agent',
      save: false  // 占位符不保存到历史
    });

    // 创建状态指示器（显示在消息内容之前）
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';
    statusIndicator.textContent = '⏳ 初始化...';
    content.parentNode.insertBefore(statusIndicator, content);

    // 记录创建时的 sessionId，防止切换会话后保存到错误的会话
    activeMessages.set(catId, {
      row,
      content,
      statusIndicator,  // 新增：状态指示器
      isThinking: true,
      fullText: '',
      saved: false,
      sessionId: currentSessionId  // 记录属于哪个会话
    });
  }
  return activeMessages.get(catId);
}

// 追加 chunk 到 agent 的消息中
function appendChunk(catId, text) {
  const entry = ensureMessage(catId);
  entry.fullText += text;

  if (entry.isThinking) {
    // 第一次收到输出，移除"正在思考"占位符，开始显示实际内容
    entry.content.textContent = text;
    entry.isThinking = false;

    // 更新状态指示器：正在生成回复
    if (entry.statusIndicator) {
      entry.statusIndicator.textContent = '💬 正在生成回复...';
    }
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

  // 状态文本映射
  const statusTexts = {
    'preparing': '📝 准备 Prompt...',
    'fetching_context': '📚 获取对话历史...',
    'invoking': '🤖 调用 CLI...'
  };

  const statusText = statusTexts[status] || `⏳ ${status}`;
  const fullText = detail ? `${statusText}\n${detail}` : statusText;

  // 更新状态指示器（而不是消息内容）
  if (entry.statusIndicator) {
    entry.statusIndicator.textContent = fullText;
    entry.statusIndicator.style.display = 'block';
  }

  // 滚动到底部
  logEl.scrollTop = logEl.scrollHeight;
}

// 过滤消息中的错误内容
function filterMessage(text) {
  // 过滤掉错误的 @ 路径
  let filtered = text.replace(/@\.sessions\/[^\s]+/g, '');
  // 过滤掉多余的空行
  filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();
  return filtered;
}

// agent 完成后重置，下次输出创建新消息
function resetMessage(catId) {
  const entry = activeMessages.get(catId);
  if (entry) {
    // 恢复正常样式
    entry.content.style.color = '';
    entry.content.style.fontStyle = '';

    // 隐藏状态指示器（CLI 执行完成）
    if (entry.statusIndicator) {
      entry.statusIndicator.style.display = 'none';
    }

    // 保存完整消息到创建时的会话（仅当有新内容且未保存过）
    // 使用 entry.sessionId 而不是 currentSessionId，防止切换会话后保存到错误的会话
    const targetSessionId = entry.sessionId;
    if (entry.fullText && entry.fullText.trim() && !entry.saved && window.SessionManager && targetSessionId) {
      // 过滤掉占位符文本和错误内容
      let text = entry.fullText.trim();
      if (!text.endsWith('正在思考...')) {
        text = filterMessage(text);
        if (text) {
          entry.saved = true;  // 先标记，防止 race condition
          window.SessionManager.addMessage(targetSessionId, catId, text);
          // 更新会话列表
          if (typeof renderSessionList === 'function') {
            renderSessionList();
          }
        }
      }
    }
  }
  activeMessages.delete(catId);
}

// 清空所有活动消息（用于新一轮对话）
// 先保存未保存的消息，再清空
function clearActiveMessages() {
  // 兜底保存：遍历所有活动消息，保存未保存的内容
  for (const [catId, entry] of activeMessages) {
    // 使用 entry.sessionId 而不是 currentSessionId，防止保存到错误的会话
    const targetSessionId = entry.sessionId;
    if (entry.fullText && entry.fullText.trim() && !entry.saved && window.SessionManager && targetSessionId) {
      let text = entry.fullText.trim();
      if (!text.endsWith('正在思考...')) {
        text = filterMessage(text);
        if (text) {
          entry.saved = true;
          window.SessionManager.addMessage(targetSessionId, catId, text);
        }
      }
    }
  }
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
      // 显式消息：callback message 是权威来源，替换式同步
      // CLI 流只用于实时预览，callback message 触发最终保存
      const entry = activeMessages.get(payload.catId);
      if (entry) {
        // 使用 callback 的内容替换现有内容（权威来源）
        entry.fullText = payload.content;
        entry.content.textContent = payload.content;
        entry.isThinking = false;
        // 恢复正常样式
        entry.content.style.color = '';
        entry.content.style.fontStyle = '';
        // 保存并清理
        resetMessage(payload.catId);
      } else {
        // 没有活动消息（可能是用户切换了会话或刷新了页面）
        // 只显示在 UI 上，不保存到历史（因为没有 sessionId 信息）
        appendMessage({
          text: payload.content,
          label: payload.catId,
          direction: 'left',
          kind: 'agent',
          save: false  // 不保存，因为没有 sessionId 信息
        });
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
  // SSE 连接移到 initSessionManager 中，使用 currentSessionId 作为 threadId
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
  // 如果没有当前会话，提示用户
  if (!currentSessionId) {
    appendMessage({ text: '请先创建或选择一个会话。', label: 'System', kind: 'system' });
    return;
  }

  // 清空上一轮的活动消息
  clearActiveMessages();

  // 每次发送消息时确保连接到正确的 thread
  // 使用 currentSessionId 作为 threadId，确保每个会话有独立的消息路由
  connectStream(currentSessionId);

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

  // 使用 currentSessionId 作为 threadId
  await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId: currentSessionId, cats, prompt })
  });
});

clearBtn.addEventListener('click', () => {
  logEl.innerHTML = '';
  clearActiveMessages();
});

// ========== 会话管理 ==========

// 更新输入框状态
function updateInputState() {
  if (currentSessionId) {
    promptInput.disabled = false;
    promptInput.placeholder = '输入你的消息，点击发送后由选中的猫猫协作处理...';
  } else {
    promptInput.disabled = true;
    promptInput.placeholder = '请先创建或选择一个会话';
  }
}

// 初始化会话管理
async function initSessionManager() {
  // 渲染会话列表
  await renderSessionList();

  // 如果有当前会话，加载消息
  currentSessionId = await window.SessionManager.getCurrentSessionId();
  if (currentSessionId) {
    const session = await window.SessionManager.getSession(currentSessionId);
    if (session) {
      loadSessionMessages(session);
      // 连接到当前会话的 thread
      connectStream(currentSessionId);
    }
  }

  // 更新输入框状态
  updateInputState();

  // 绑定会话列表事件
  window.HistoryPanel.bindEvents(sessionList, {
    onSwitch: async (sessionId) => {
      currentSessionId = sessionId;
      const session = await window.SessionManager.switchSession(sessionId);
      if (session) {
        loadSessionMessages(session);
        await renderSessionList();
        // 切换会话时重新连接到新的 thread
        connectStream(sessionId);
      }
      updateInputState();
    },
    onRename: (sessionId) => {
      window.HistoryPanel.startRename(sessionList, sessionId);
    },
    onDelete: async (sessionId) => {
      if (confirm('确定要删除这个会话吗？')) {
        await window.SessionManager.deleteSession(sessionId);
        currentSessionId = await window.SessionManager.getCurrentSessionId();
        await renderSessionList();
        // 如果删除的是当前会话，清空消息区域
        if (!currentSessionId) {
          logEl.innerHTML = '';
          // 没有会话时断开 SSE 连接
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
        } else {
          const session = await window.SessionManager.getSession(currentSessionId);
          if (session) loadSessionMessages(session);
          // 连接到新的当前会话的 thread
          connectStream(currentSessionId);
        }
        updateInputState();
      }
    }
  });

  // 新建会话按钮
  newSessionBtn.addEventListener('click', async () => {
    // 检查是否已有一个空白会话
    const sessions = await window.SessionManager.getAllSessions();
    const emptySession = sessions.find(s => !s.messageCount || s.messageCount === 0);

    if (emptySession) {
      // 切换到空白会话
      currentSessionId = emptySession.id;
      await window.SessionManager.switchSession(emptySession.id);
    } else {
      // 创建新会话
      const session = await window.SessionManager.createSession();
      currentSessionId = session.id;
    }

    logEl.innerHTML = '';
    clearActiveMessages();
    // 新建会话时连接到新的 thread
    connectStream(currentSessionId);
    await renderSessionList();
    updateInputState();
    promptInput.focus();
  });

  // 搜索框
  sessionSearch.addEventListener('input', async () => {
    const query = sessionSearch.value.trim();
    const sessions = await window.SessionManager.searchSessions(query);
    renderSessionListWithFilter(sessions, currentSessionId);
  });
}

// 渲染会话列表
async function renderSessionList() {
  const sessions = await window.SessionManager.getAllSessions();
  renderSessionListWithFilter(sessions, currentSessionId);
}

// 渲染过滤后的会话列表
function renderSessionListWithFilter(sessions, highlightId) {
  sessionList.innerHTML = '';

  if (sessions.length === 0) {
    sessionList.innerHTML = '<div class="no-sessions">没有匹配的会话</div>';
    return;
  }

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item' + (highlightId && session.id === highlightId ? ' active' : '');
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
      kind: isUser ? 'user' : 'agent',
      save: false  // 加载历史消息时不重复保存
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
