/**
 * 会话管理模块
 *
 * 负责管理会话的存储和检索，使用 localStorage 持久化
 */

const STORAGE_KEY = 'cat-cafe-sessions';

// 生成唯一 ID
function generateId() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 获取所有数据
function getData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
  return { sessions: [], currentSessionId: null };
}

// 保存数据
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
}

// 创建新会话
function createSession() {
  const data = getData();
  const session = {
    id: generateId(),
    title: null, // 稍后根据第一条消息自动生成
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };
  data.sessions.unshift(session);
  data.currentSessionId = session.id;
  saveData(data);
  return session;
}

// 获取当前会话
function getCurrentSession() {
  const data = getData();
  if (!data.currentSessionId) {
    return null;
  }
  return data.sessions.find(s => s.id === data.currentSessionId) || null;
}

// 切换会话
function switchSession(id) {
  const data = getData();
  const session = data.sessions.find(s => s.id === id);
  if (session) {
    data.currentSessionId = id;
    saveData(data);
    return session;
  }
  return null;
}

// 添加消息到当前会话
function addMessage(role, content) {
  const data = getData();
  const session = data.sessions.find(s => s.id === data.currentSessionId);
  if (!session) {
    // 如果没有当前会话，创建一个
    const newSession = createSession();
    return addMessage(role, content);
  }

  const message = {
    role,
    content,
    ts: Date.now()
  };
  session.messages.push(message);
  session.updatedAt = Date.now();

  // 自动生成标题（根据第一条用户消息）
  if (!session.title && role === 'user') {
    session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
  }

  saveData(data);
  return message;
}

// 重命名会话
function renameSession(id, title) {
  const data = getData();
  const session = data.sessions.find(s => s.id === id);
  if (session) {
    session.title = title;
    session.updatedAt = Date.now();
    saveData(data);
    return session;
  }
  return null;
}

// 删除会话
function deleteSession(id) {
  const data = getData();
  const index = data.sessions.findIndex(s => s.id === id);
  if (index !== -1) {
    data.sessions.splice(index, 1);
    // 如果删除的是当前会话，切换到第一个会话
    if (data.currentSessionId === id) {
      data.currentSessionId = data.sessions[0]?.id || null;
    }
    saveData(data);
    return true;
  }
  return false;
}

// 搜索会话
function searchSessions(query) {
  const data = getData();
  if (!query) {
    return data.sessions;
  }
  const lowerQuery = query.toLowerCase();
  return data.sessions.filter(s => {
    // 搜索标题
    if (s.title && s.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // 搜索消息内容
    return s.messages.some(m => m.content.toLowerCase().includes(lowerQuery));
  });
}

// 获取所有会话摘要
function getAllSessions() {
  const data = getData();
  return data.sessions.map(s => ({
    id: s.id,
    title: s.title || '未命名会话',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length
  }));
}

// 获取会话消息
function getSessionMessages(id) {
  const data = getData();
  const session = data.sessions.find(s => s.id === id);
  return session ? session.messages : [];
}

// 清空所有会话
function clearAllSessions() {
  saveData({ sessions: [], currentSessionId: null });
}

// 导出模块
window.SessionManager = {
  createSession,
  getCurrentSession,
  switchSession,
  addMessage,
  renameSession,
  deleteSession,
  searchSessions,
  getAllSessions,
  getSessionMessages,
  clearAllSessions
};
