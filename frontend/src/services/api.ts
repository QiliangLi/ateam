/**
 * 后端 API 服务层
 */

import type { Session, BootstrapResponse, RunRequest, SSEEvent } from '../types';

const API_BASE = '';  // 相对路径，由 Vite 代理或同源访问

// ========== Bootstrap ==========

export async function bootstrap(): Promise<BootstrapResponse> {
  const res = await fetch(`${API_BASE}/api/bootstrap`);
  if (!res.ok) throw new Error(`Bootstrap failed: ${res.status}`);
  return res.json();
}

// ========== Sessions ==========

export async function getSessions(search?: string): Promise<{ sessions: Session[]; currentSessionId: string | null }> {
  const url = search
    ? `${API_BASE}/api/sessions?search=${encodeURIComponent(search)}`
    : `${API_BASE}/api/sessions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Get sessions failed: ${res.status}`);
  return res.json();
}

export async function createSession(): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions`, { method: 'POST' });
  if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
  return res.json();
}

export async function getSession(sessionId: string, before?: number): Promise<Session> {
  const url = before
    ? `${API_BASE}/api/sessions/${sessionId}?before=${before}`
    : `${API_BASE}/api/sessions/${sessionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Get session failed: ${res.status}`);
  return res.json();
}

export async function switchSession(sessionId: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/switch`, { method: 'POST' });
  if (!res.ok) throw new Error(`Switch session failed: ${res.status}`);
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete session failed: ${res.status}`);
  return res.json();
}

export async function renameSession(sessionId: string, title: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error(`Rename session failed: ${res.status}`);
  return res.json();
}

export async function addMessage(sessionId: string, role: string, content: string): Promise<{ id: string; role: string; content: string; ts: number }> {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content })
  });
  if (!res.ok) throw new Error(`Add message failed: ${res.status}`);
  return res.json();
}

// ========== Run ==========

export async function runAgent(request: RunRequest): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error(`Run failed: ${res.status}`);
  return res.json();
}

// ========== SSE Stream ==========

export interface SSECallbacks {
  onStatus?: (catId: string, status: string, detail?: string) => void;
  onCli?: (catId: string, text: string) => void;
  onThinking?: (catId: string, thinking: string) => void;
  onToolCall?: (catId: string, toolName: string, toolInput: Record<string, unknown>) => void;
  onMetrics?: (catId: string, metrics: NonNullable<SSEEvent['metrics']>) => void;
  onMessage?: (catId: string, content: string) => void;
  onSystem?: (message: string) => void;
  onError?: (error: Error) => void;
}

export function connectStream(threadId: string, callbacks: SSECallbacks): EventSource {
  const eventSource = new EventSource(`${API_BASE}/api/stream?threadId=${encodeURIComponent(threadId)}`);

  eventSource.onmessage = (event) => {
    try {
      const payload: SSEEvent = JSON.parse(event.data);

      switch (payload.type) {
        case 'status':
          callbacks.onStatus?.(payload.catId || '', payload.status || '', payload.detail);
          break;
        case 'cli':
          callbacks.onCli?.(payload.catId || '', payload.text || '');
          break;
        case 'thinking':
          if (payload.thinking) {
            callbacks.onThinking?.(payload.catId || '', payload.thinking);
          }
          break;
        case 'tool_call':
          if (payload.toolName) {
            callbacks.onToolCall?.(payload.catId || '', payload.toolName, payload.toolInput || {});
          }
          break;
        case 'metrics':
          if (payload.metrics) {
            callbacks.onMetrics?.(payload.catId || '', payload.metrics);
          }
          break;
        case 'message':
          callbacks.onMessage?.(payload.catId || '', payload.content || '');
          break;
        case 'system':
          callbacks.onSystem?.(payload.message || '');
          break;
      }
    } catch (e) {
      console.error('Failed to parse SSE event:', e);
    }
  };

  eventSource.onerror = () => {
    callbacks.onError?.(new Error('SSE connection error'));
  };

  return eventSource;
}
