#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { randomUUID } = require('crypto');
const { enqueueA2ATargets } = require('../a2a/registry');
const { routeSerial, getDefaultMcpServerPath } = require('../a2a/router');
const { listCatIds } = require('../config/cats');
const { writeIoLog } = require('../utils/io-logger');
const sessionStore = require('../utils/session-store');

const PORT = Number(process.env.CAT_CAFE_PORT || 3200);
const WEB_DIR = path.join(__dirname, '../../frontend/dist');

const invocationId = randomUUID();
const callbackToken = randomUUID();

const threadMessages = new Map();
const sseClients = new Set();
const activeThreads = new Set();
const threadQueues = new Map(); // threadId -> [{ payload, resolve }]

function getThreadMessages(threadId) {
  if (!threadMessages.has(threadId)) {
    threadMessages.set(threadId, []);
  }
  return threadMessages.get(threadId);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function validateToken(payload) {
  return payload.invocationId === invocationId && payload.callbackToken === callbackToken;
}

function pushEvent(threadId, event) {
  writeIoLog('chat.output', { threadId, event });
  const payload = JSON.stringify(event);
  for (const client of sseClients) {
    if (client.threadId !== threadId) continue;
    client.res.write(`data: ${payload}\n\n`);
  }
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const filePath = path.join(WEB_DIR, pathname);
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }
  const ext = path.extname(filePath);
  const type = ext === '.css' ? 'text/css' : ext === '.js' ? 'text/javascript' : 'text/html';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleRun(payload) {
  const threadId = payload.threadId || 'default';

  // 如果 thread 正在执行，将请求加入队列
  if (activeThreads.has(threadId)) {
    return new Promise((resolve) => {
      if (!threadQueues.has(threadId)) {
        threadQueues.set(threadId, []);
      }
      threadQueues.get(threadId).push({ payload, resolve });
      pushEvent(threadId, { type: 'system', message: '请求已加入队列，请稍候...' });
    });
  }

  const cats = Array.isArray(payload.cats) && payload.cats.length
    ? payload.cats
    : ['opus'];

  activeThreads.add(threadId);
  pushEvent(threadId, { type: 'system', message: `开始执行: ${cats.join(', ')}` });

  try {
    await routeSerial([...cats], {
      prompt: payload.prompt || '',
      threadId,
      apiUrl: `http://localhost:${PORT}`,
      invocationId,
      callbackToken,
      mcpServerPath: getDefaultMcpServerPath(),
      onOutput: (event) => {
        if (event.type === 'cli') {
          pushEvent(threadId, { type: 'cli', catId: event.catId, text: event.text });
        } else if (event.type === 'thinking') {
          // 思考过程
          pushEvent(threadId, { type: 'thinking', catId: event.catId, thinking: event.thinking });
        } else if (event.type === 'tool_call') {
          // 工具调用
          pushEvent(threadId, {
            type: 'tool_call',
            catId: event.catId,
            toolName: event.toolName,
            toolInput: event.toolInput
          });
        } else if (event.type === 'metrics') {
          // 最终指标
          pushEvent(threadId, { type: 'metrics', catId: event.catId, metrics: event.metrics });
        }
      },
      onStatus: (event) => {
        // 发送状态更新到前端
        pushEvent(threadId, { type: 'status', catId: event.catId, status: event.status, detail: event.detail, ts: event.ts });
      }
    });
    pushEvent(threadId, { type: 'system', message: '执行完成。' });
  } catch (err) {
    pushEvent(threadId, { type: 'system', message: `执行失败: ${err.message}` });
  } finally {
    activeThreads.delete(threadId);

    // 检查队列中是否有等待的请求
    const queue = threadQueues.get(threadId);
    if (queue && queue.length > 0) {
      const next = queue.shift();
      if (queue.length === 0) {
        threadQueues.delete(threadId);
      }
      // 异步处理下一个请求
      setImmediate(() => {
        handleRun(next.payload).then(next.resolve);
      });
    }
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/api/stream')) {
    const threadId = parsedUrl.query.threadId || 'default';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');
    const client = { res, threadId };
    sseClients.add(client);
    req.on('close', () => {
      sseClients.delete(client);
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    writeIoLog('chat.input.bootstrap', { path: pathname });
    return sendJson(res, 200, {
      apiUrl: `http://localhost:${PORT}`,
      invocationId,
      callbackToken,
      cats: listCatIds()
    });
  }

  // ========== Sessions API ==========

  // GET /api/sessions - 获取会话列表
  if (req.method === 'GET' && pathname === '/api/sessions') {
    const query = parsedUrl.query.search || '';
    const sessions = query
      ? sessionStore.searchSessions(query)
      : sessionStore.getAllSessions();
    return sendJson(res, 200, { sessions, currentSessionId: sessionStore.getCurrentSessionId() });
  }

  // POST /api/sessions - 创建新会话
  if (req.method === 'POST' && pathname === '/api/sessions') {
    const session = sessionStore.createSession();
    return sendJson(res, 200, session);
  }

  // GET /api/sessions/:id - 获取会话详情
  const sessionMatch = pathname.match(/^\/api\/sessions\/([^\/]+)$/);
  if (sessionMatch && req.method === 'GET') {
    const sessionId = sessionMatch[1];
    const before = parsedUrl.query.before ? parseInt(parsedUrl.query.before) : undefined;
    const session = sessionStore.getSession(sessionId, { before });
    if (!session) {
      return sendJson(res, 404, { error: 'session_not_found' });
    }
    // 获取消息总数
    const full = sessionStore.getSessionFull(sessionId);
    session.totalMessages = full ? full.messages.length : 0;
    return sendJson(res, 200, session);
  }

  // PUT /api/sessions/:id - 更新会话（重命名）
  if (sessionMatch && req.method === 'PUT') {
    const sessionId = sessionMatch[1];
    const raw = await readBody(req);
    let payload = {};
    try {
      payload = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }
    if (payload.title) {
      const session = sessionStore.renameSession(sessionId, payload.title);
      if (!session) {
        return sendJson(res, 404, { error: 'session_not_found' });
      }
      return sendJson(res, 200, session);
    }
    return sendJson(res, 400, { error: 'title_required' });
  }

  // DELETE /api/sessions/:id - 删除会话
  if (sessionMatch && req.method === 'DELETE') {
    const sessionId = sessionMatch[1];
    const deleted = sessionStore.deleteSession(sessionId);
    if (!deleted) {
      return sendJson(res, 404, { error: 'session_not_found' });
    }
    return sendJson(res, 200, { success: true });
  }

  // POST /api/sessions/:id/switch - 切换会话
  if (pathname.match(/^\/api\/sessions\/[^\/]+\/switch$/) && req.method === 'POST') {
    const sessionId = pathname.split('/')[3];
    const session = sessionStore.switchSession(sessionId);
    if (!session) {
      return sendJson(res, 404, { error: 'session_not_found' });
    }
    const full = sessionStore.getSessionFull(sessionId);
    session.totalMessages = full ? full.messages.length : 0;
    return sendJson(res, 200, session);
  }

  // POST /api/sessions/:id/messages - 添加消息
  if (pathname.match(/^\/api\/sessions\/[^\/]+\/messages$/) && req.method === 'POST') {
    const sessionId = pathname.split('/')[3];
    const raw = await readBody(req);
    let payload = {};
    try {
      payload = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }
    if (!payload.role || !payload.content) {
      return sendJson(res, 400, { error: 'role_and_content_required' });
    }
    const message = sessionStore.addMessage(sessionId, payload.role, payload.content);
    if (!message) {
      return sendJson(res, 404, { error: 'session_not_found' });
    }
    return sendJson(res, 200, message);
  }

  // ========== End Sessions API ==========

  // ========== Display Settings API ==========

  // GET /api/settings/display - 获取显示设置
  if (req.method === 'GET' && pathname === '/api/settings/display') {
    const { handleGetDisplaySettings } = require('../routes/settings');
    return handleGetDisplaySettings(req, res, sendJson);
  }

  // POST /api/settings/display - 更新显示设置
  if (req.method === 'POST' && pathname === '/api/settings/display') {
    const { handleUpdateDisplaySettings } = require('../routes/settings');
    return handleUpdateDisplaySettings(req, res, sendJson, readBody);
  }

  // ========== End Display Settings API ==========

  if (req.method === 'POST' && pathname === '/api/run') {
    const raw = await readBody(req);
    let payload = null;
    try {
      payload = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }
    writeIoLog('chat.input.run', { threadId: payload.threadId || 'default', payload });
    
    // 更新当前会话 ID（刷新页面后能恢复）
    const threadId = payload.threadId || 'default';
    if (threadId !== 'default') {
      sessionStore.switchSession(threadId);
    }
    
    sendJson(res, 200, { status: 'queued' });
    void handleRun(payload);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/callbacks/post-message') {
    const raw = await readBody(req);
    let payload = null;
    try {
      payload = JSON.parse(raw || '{}');
    } catch (e) {
      return sendJson(res, 400, { error: 'invalid_json' });
    }

    writeIoLog('chat.input.callback', { payload });

    if (!validateToken(payload)) {
      return sendJson(res, 401, { error: 'unauthorized' });
    }

    const threadId = payload.threadId || 'default';
    const catId = payload.catId || 'unknown';
    const content = payload.content || '';

    const messages = getThreadMessages(threadId);
    messages.push({ role: catId, content, ts: Date.now() });
    pushEvent(threadId, { type: 'message', catId, content });

    const mentions = enqueueA2ATargets(threadId, content, catId, {
      mode: 'agent',
      maxTargets: 2,
      allowRequeueExecuted: true,
      maxRequeuePerCat: 1
    });
    if (mentions.length > 0) {
      pushEvent(threadId, { type: 'system', message: `A2A 入队: ${mentions.join(', ')}` });
    }

    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && pathname === '/api/callbacks/thread-context') {
    const query = parsedUrl.query || {};
    const payload = {
      invocationId: query.invocationId,
      callbackToken: query.callbackToken
    };

    writeIoLog('chat.input.callback', { payload });

    if (!validateToken(payload)) {
      return sendJson(res, 401, { error: 'unauthorized' });
    }

    const threadId = query.threadId || 'default';
    const messages = getThreadMessages(threadId);
    return sendJson(res, 200, { messages });
  }

  if (serveStatic(req, res)) return;
  sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`Chat server listening on :${PORT}`);
  console.log(`invocationId: ${invocationId}`);
  console.log(`callbackToken: ${callbackToken}`);
});
