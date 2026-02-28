/**
 * 历史记录面板模块
 *
 * 负责渲染和管理左侧会话列表 UI
 */

// 格式化时间
function formatTime(ts) {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 渲染会话列表
function render(container) {
  const sessions = window.SessionManager.getAllSessions();
  const currentSession = window.SessionManager.getCurrentSession();
  const currentId = currentSession?.id;

  container.innerHTML = '';

  if (sessions.length === 0) {
    container.innerHTML = '<div class="no-sessions">暂无会话记录</div>';
    return;
  }

  sessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item' + (session.id === currentId ? ' active' : '');
    item.dataset.sessionId = session.id;

    item.innerHTML = `
      <div class="session-content">
        <div class="session-title">${escapeHtml(session.title)}</div>
        <div class="session-meta">${session.messageCount} 条消息 · ${formatTime(session.updatedAt)}</div>
      </div>
      <div class="session-actions">
        <button class="session-rename" title="重命名">✏️</button>
        <button class="session-delete" title="删除">🗑️</button>
      </div>
    `;

    container.appendChild(item);
  });
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 高亮当前会话
function highlightCurrent(container, id) {
  container.querySelectorAll('.session-item').forEach(item => {
    item.classList.toggle('active', item.dataset.sessionId === id);
  });
}

// 绑定事件
function bindEvents(container, handlers) {
  container.addEventListener('click', (e) => {
    const item = e.target.closest('.session-item');
    if (!item) return;

    const sessionId = item.dataset.sessionId;

    // 点击重命名按钮
    if (e.target.classList.contains('session-rename')) {
      e.stopPropagation();
      if (handlers.onRename) {
        handlers.onRename(sessionId);
      }
      return;
    }

    // 点击删除按钮
    if (e.target.classList.contains('session-delete')) {
      e.stopPropagation();
      if (handlers.onDelete) {
        handlers.onDelete(sessionId);
      }
      return;
    }

    // 点击切换会话
    if (handlers.onSwitch) {
      handlers.onSwitch(sessionId);
    }
  });
}

// 开始重命名
function startRename(container, sessionId) {
  const item = container.querySelector(`[data-session-id="${sessionId}"]`);
  if (!item) return;

  const titleEl = item.querySelector('.session-title');
  const currentTitle = titleEl.textContent;

  titleEl.innerHTML = `<input type="text" class="session-title-input" value="${escapeHtml(currentTitle)}">`;
  const input = titleEl.querySelector('input');
  input.focus();
  input.select();

  const finishRename = () => {
    const newTitle = input.value.trim() || currentTitle;
    window.SessionManager.renameSession(sessionId, newTitle);
    render(container);
  };

  input.addEventListener('blur', finishRename);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishRename();
    }
    if (e.key === 'Escape') {
      render(container);
    }
  });
}

// 导出模块
window.HistoryPanel = {
  render,
  highlightCurrent,
  bindEvents,
  startRename
};
