/**
 * 会话存储工具
 *
 * 负责会话的文件读写操作
 */

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions');
const INDEX_FILE = path.join(SESSIONS_DIR, 'index.json');
const DEFAULT_LOAD_LIMIT = 500;

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

// 生成唯一 ID
function generateId() {
  return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// 获取索引
function getIndex() {
  ensureDir();
  if (!fs.existsSync(INDEX_FILE)) {
    return { sessions: [], currentSessionId: null };
  }
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  } catch (e) {
    return { sessions: [], currentSessionId: null };
  }
}

// 保存索引
function saveIndex(index) {
  ensureDir();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// 获取会话文件路径
function getSessionPath(sessionId) {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

// 获取所有会话摘要
function getAllSessions() {
  const index = getIndex();
  return index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

// 获取当前会话 ID
function getCurrentSessionId() {
  const index = getIndex();
  return index.currentSessionId;
}

// 创建新会话
function createSession() {
  ensureDir();
  const id = generateId();
  const now = Date.now();
  const session = {
    id,
    title: null,
    createdAt: now,
    updatedAt: now,
    messages: []
  };

  // 保存会话文件
  fs.writeFileSync(getSessionPath(id), JSON.stringify(session, null, 2));

  // 更新索引
  const index = getIndex();
  index.sessions.unshift({
    id,
    title: null,
    createdAt: now,
    updatedAt: now,
    messageCount: 0
  });
  index.currentSessionId = id;
  saveIndex(index);

  return session;
}

// 获取会话详情
function getSession(sessionId, options = {}) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 限制加载的消息数量
  const limit = options.limit || DEFAULT_LOAD_LIMIT;
  const before = options.before; // 时间戳，加载此时间之前的消息

  if (session.messages && session.messages.length > limit) {
    if (before) {
      // 加载 before 之前的 limit 条消息
      const filtered = session.messages.filter(m => m.ts < before);
      session.messages = filtered.slice(-limit);
    } else {
      // 加载最近的 limit 条消息
      session.messages = session.messages.slice(-limit);
    }
    session.hasMore = session.messages.length < (options.totalCount || session.messages.length);
  }

  return session;
}

// 获取会话完整信息（含消息总数）
function getSessionFull(sessionId) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 切换会话
function switchSession(sessionId) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const index = getIndex();
  index.currentSessionId = sessionId;
  saveIndex(index);

  return getSession(sessionId);
}

// 添加消息到会话
function addMessage(sessionId, role, content) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const message = {
    role,
    content,
    ts: Date.now()
  };
  session.messages.push(message);
  session.updatedAt = message.ts;

  // 自动生成标题（根据第一条用户消息）
  if (!session.title && role === 'user') {
    session.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
  }

  // 保存会话文件
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

  // 更新索引
  const index = getIndex();
  const idx = index.sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    index.sessions[idx].title = session.title;
    index.sessions[idx].updatedAt = session.updatedAt;
    index.sessions[idx].messageCount = session.messages.length;
    // 重新排序（最近更新的在前面）
    index.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    saveIndex(index);
  }

  return message;
}

// 重命名会话
function renameSession(sessionId, title) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  session.title = title;
  session.updatedAt = Date.now();
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));

  // 更新索引
  const index = getIndex();
  const idx = index.sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    index.sessions[idx].title = title;
    index.sessions[idx].updatedAt = session.updatedAt;
    saveIndex(index);
  }

  return session;
}

// 删除会话
function deleteSession(sessionId) {
  const filePath = getSessionPath(sessionId);
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);

  // 更新索引
  const index = getIndex();
  index.sessions = index.sessions.filter(s => s.id !== sessionId);
  if (index.currentSessionId === sessionId) {
    index.currentSessionId = index.sessions[0]?.id || null;
  }
  saveIndex(index);

  return true;
}

// 搜索会话
function searchSessions(query) {
  const index = getIndex();
  if (!query) {
    return index.sessions;
  }
  const lowerQuery = query.toLowerCase();
  return index.sessions.filter(s => {
    if (s.title && s.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // 搜索消息内容需要读取文件
    const session = getSessionFull(s.id);
    return session.messages.some(m => m.content.toLowerCase().includes(lowerQuery));
  });
}

module.exports = {
  getAllSessions,
  getCurrentSessionId,
  createSession,
  getSession,
  getSessionFull,
  switchSession,
  addMessage,
  renameSession,
  deleteSession,
  searchSessions,
  DEFAULT_LOAD_LIMIT
};
