/**
 * 会话管理模块
 *
 * 负责管理会话的存储和检索，通过后端 API 存储
 */

const DEFAULT_LOAD_LIMIT = 500;

// 获取会话列表
async function getAllSessions() {
  const res = await fetch('/api/sessions');
  const data = await res.json();
  return data.sessions || [];
}

// 获取当前会话 ID
async function getCurrentSessionId() {
  const res = await fetch('/api/sessions');
  const data = await res.json();
  return data.currentSessionId || null;
}

// 创建新会话
async function createSession() {
  const res = await fetch('/api/sessions', { method: 'POST' });
  return await res.json();
}

// 获取会话详情
async function getSession(sessionId, options = {}) {
  let url = `/api/sessions/${sessionId}`;
  const params = [];
  if (options.before) {
    params.push(`before=${options.before}`);
  }
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

// 切换会话
async function switchSession(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}/switch`, { method: 'POST' });
  if (!res.ok) return null;
  return await res.json();
}

// 添加消息到会话
async function addMessage(sessionId, role, content) {
  // 如果没有 sessionId，先创建一个
  if (!sessionId) {
    const session = await createSession();
    sessionId = session.id;
  }

  const res = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content })
  });
  if (!res.ok) return null;
  return await res.json();
}

// 重命名会话
async function renameSession(sessionId, title) {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) return null;
  return await res.json();
}

// 删除会话
async function deleteSession(sessionId) {
  const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
  return res.ok;
}

// 搜索会话
async function searchSessions(query) {
  const url = query ? `/api/sessions?search=${encodeURIComponent(query)}` : '/api/sessions';
  const res = await fetch(url);
  const data = await res.json();
  return data.sessions || [];
}

// 导出模块
window.SessionManager = {
  getAllSessions,
  getCurrentSessionId,
  createSession,
  getSession,
  switchSession,
  addMessage,
  renameSession,
  deleteSession,
  searchSessions,
  DEFAULT_LOAD_LIMIT
};
