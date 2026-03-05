import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Plus, MessageSquare, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { SidebarRight } from './components/SidebarRight';
import { SettingsModal } from './components/SettingsModal';
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext';
import * as api from './services/api';
import type { Session, Message, SSEEvent } from './types';
import './index.css';

interface Agent {
  id: string;
  display: string;
}

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const activeMessagesRef = useRef<Map<string, {
    content: string;
    sessionId: string;
    thoughtProcess?: string;
    status?: string;
  }>>(new Map());


  // 状态文本转换
  function getStatusText(status: string, detail?: string): string {
    const statusMap: Record<string, string> = {
      'preparing': '📝 准备 Prompt...',
      'fetching_context': '📚 获取对话历史...',
      'invoking': '🤖 调用 CLI...',
      'thinking': '💭 思考中...',
      'tool_call': '🔧 使用工具...',
      'replying': '💬 生成回复...',
    };
    const text = statusMap[status] || status;
    return detail ? `${text}\n${detail}` : text;
  }


  // 生成模拟的 metrics 数据（后端暂不支持)
  function generateMockMetrics(catId: string): { model: string; ttfb: string; tokens: string; cache: string } {
    // 根据不同的 agent 生成不同的模型名称
    const modelMap: Record<string, string> = {
      'opus': 'claude-opus-4',
      'codex': 'gpt-4o',
      'gemini': 'gemini-2.0-flash'
    }
    return {
      model: modelMap[catId] || catId,
      ttfb: `${(0.3 + Math.random() * 0.5).toFixed(1)}s`,
      tokens: `${Math.floor(Math.random() * 200 + 500)}`,
      cache: Math.random() > 0 ? 'Hit' : 'Miss'
    }
  }


  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        // 获取 agent 列表
        const bootstrapData = await api.bootstrap();
        setAgents(bootstrapData.cats.map(id => ({ id, display: id })));

        // 获取会话列表
        const { sessions: sessionList, currentSessionId: currentId } = await api.getSessions();
        setSessions(sessionList);
        setCurrentSessionId(currentId);

        // 如果有当前会话，加载完整消息并连接 SSE
        if (currentId) {
          const session = await api.getSession(currentId);
          setSessions(prev => prev.map(s => s.id === currentId ? session : s));
          connectStream(currentId);
        }
      } catch (err) {
        console.error('Bootstrap failed:', err);
      }
    };
    init();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // 连接 SSE 流
  const connectStream = useCallback((threadId: string) => {
    eventSourceRef.current?.close();

    eventSourceRef.current = api.connectStream(threadId, {
      onStatus: (catId, status, detail) => {
        console.log('[SSE] Status:', catId, status, detail);

        // 更新 agent 的思考过程
        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          const existing = activeMessagesRef.current.get(catId);
          const statusText = getStatusText(status, detail);
          activeMessagesRef.current.set(catId, {
            ...existing,
            content: existing?.content || '',
            sessionId: threadId,
            thoughtProcess: statusText,
            status,
          });

          // 查找是否已有该 agent 的消息
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId && !m.metrics
          );

          if (agentMsgIdx >= 0) {
            // 更新现有消息的思考过程
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              thoughtProcess: (updated[agentMsgIdx].thoughtProcess || '') + statusText,
            };
            return { ...session, messages: updated };
          } else {
            // 创建新消息
            const newMsg: Message = {
              id: `${Date.now()}-${catId}`,
              role: 'agent',
              agentName: catId,
              content: '',
              thoughtProcess: statusText,
              ts: Date.now()
            };
            return { ...session, messages: [...session.messages, newMsg] };
          }
        }));
      },
      onCli: (catId, text) => {
        // 流式输出：追加到 agent 的消息中
        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          const existing = activeMessagesRef.current.get(catId);
          const newContent = (existing?.content || '') + text;
          // 保留 thoughtProcess 和 status
          activeMessagesRef.current.set(catId, {
            ...existing,
            content: newContent,
            sessionId: threadId,
            thoughtProcess: existing?.thoughtProcess || '',
            status: existing?.status || '',
          });

          // 查找是否已有该 agent 的消息
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId && !m.metrics
          );

          if (agentMsgIdx >= 0) {
            // 更新现有消息
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              content: newContent,
              thoughtProcess: existing?.thoughtProcess || updated[agentMsgIdx].thoughtProcess,
            };
            return { ...session, messages: updated };
          } else {
            // 创建新消息
            const newMsg: Message = {
              id: `${Date.now()}-${catId}`,
              role: 'agent',
              agentName: catId,
              content: newContent,
              thoughtProcess: existing?.thoughtProcess || '',
              ts: Date.now()
            };
            return { ...session, messages: [...session.messages, newMsg] };
          }
        }));
      },
      onThinking: (catId, thinking) => {
        // 思考过程：追加到 agent 的消息中
        console.log('[SSE] Thinking:', catId, thinking.length, 'chars');

        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          const existing = activeMessagesRef.current.get(catId);
          const newThoughtProcess = (existing?.thoughtProcess || '') + '\n' + thinking;
          activeMessagesRef.current.set(catId, {
            content: existing?.content || '',
            sessionId: threadId,
            thoughtProcess: newThoughtProcess,
          });

          // 查找是否已有该 agent 的消息
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId && !m.metrics
          );

          if (agentMsgIdx >= 0) {
            // 更新现有消息的思考过程
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              thoughtProcess: newThoughtProcess,
            };
            return { ...session, messages: updated };
          } else {
            // 创建新消息
            const newMsg: Message = {
              id: `${Date.now()}-${catId}`,
              role: 'agent',
              agentName: catId,
              content: '',
              thoughtProcess: newThoughtProcess,
              ts: Date.now()
            };
            return { ...session, messages: [...session.messages, newMsg] };
          }
        }));
      },
      onToolCall: (catId, toolName, toolInput) => {
        // 工具调用：记录工具使用信息
        console.log('[SSE] ToolCall:', catId, toolName);

        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          const existing = activeMessagesRef.current.get(catId);
          // 将工具调用追加到思考过程中
          const toolCallText = `\n🔧 使用工具: ${toolName}\n${JSON.stringify(toolInput, null, 2)}`;
          const newThoughtProcess = (existing?.thoughtProcess || '') + toolCallText;
          activeMessagesRef.current.set(catId, {
            content: existing?.content || '',
            sessionId: threadId,
            thoughtProcess: newThoughtProcess,
          });

          // 查找是否已有该 agent 的消息
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId && !m.metrics
          );

          if (agentMsgIdx >= 0) {
            // 更新现有消息的思考过程
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              thoughtProcess: newThoughtProcess,
            };
            return { ...session, messages: updated };
          } else {
            // 创建新消息
            const newMsg: Message = {
              id: `${Date.now()}-${catId}`,
              role: 'agent',
              agentName: catId,
              content: '',
              thoughtProcess: newThoughtProcess,
              ts: Date.now()
            };
            return { ...session, messages: [...session.messages, newMsg] };
          }
        }));
      },
      onMetrics: (catId, metrics) => {
        // 真实 metrics 数据：格式化并更新消息
        console.log('[SSE] Metrics:', catId, metrics);

        // 将后端 metrics 转换为前端需要的格式
        const formattedMetrics = {
          model: catId === 'opus' ? 'claude-opus-4' : catId === 'codex' ? 'gpt-4o' : 'gemini-2.0-flash',
          ttfb: metrics.duration_ms ? `${(metrics.duration_ms / 1000).toFixed(1)}s` : '-',
          tokens: `${metrics.input_tokens || 0} + ${metrics.output_tokens || 0}`,
          cache: metrics.cache_read_input_tokens ? `Hit (${metrics.cache_read_input_tokens})` : 'Miss'
        };

        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          // 查找该 agent 的消息并设置 metrics
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId
          );

          if (agentMsgIdx >= 0) {
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              metrics: formattedMetrics
            };
            return { ...session, messages: updated };
          }
          return session;
        }));
      },
      onMessage: (catId, content) => {
        // 显式消息：callback message 是权威来源
        const existing = activeMessagesRef.current.get(catId);
        activeMessagesRef.current.set(catId, { ...existing, content, sessionId: threadId });

        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;

          // 查找并更新该 agent 的消息
          const agentMsgIdx = session.messages.findIndex(
            m => m.role === 'agent' && m.agentName === catId
          );

          if (agentMsgIdx >= 0) {
            const updated = [...session.messages];
            updated[agentMsgIdx] = {
              ...updated[agentMsgIdx],
              content,
              // 保留已有的 thoughtProcess
              thoughtProcess: existing?.thoughtProcess || updated[agentMsgIdx].thoughtProcess,
              // 保留已有的 metrics（如果有）
              metrics: updated[agentMsgIdx].metrics
            };
            return { ...session, messages: updated };
          } else {
            const newMsg: Message = {
              id: `${Date.now()}-${catId}`,
              role: 'agent',
              agentName: catId,
              content,
              thoughtProcess: existing?.thoughtProcess || '',
              ts: Date.now()
            };
            return { ...session, messages: [...session.messages, newMsg] };
          }
        }));
      },
      onSystem: (message) => {
        console.log('[SSE] System:', message);

        // 如果执行完成，清空活动消息
        if (message.includes('执行完成')) {
          setIsRunning(false);
          activeMessagesRef.current.clear();
        }

        // 添加系统消息
        setSessions(prev => prev.map(session => {
          if (session.id !== threadId) return session;
          const sysMsg: Message = {
            id: `sys-${Date.now()}`,
            role: 'system',
            content: message,
            ts: Date.now()
          };
          return { ...session, messages: [...session.messages, sysMsg] };
        }));
      },
      onError: (error) => {
        console.error('[SSE] Error:', error);
        setIsRunning(false);
      }
    });
  }, []);

  // 创建新会话
  const handleCreateSession = async () => {
    try {
      const session = await api.createSession();
      setSessions(prev => [session, ...prev]);
      setCurrentSessionId(session.id);
      activeMessagesRef.current.clear();
      connectStream(session.id);
    } catch (err) {
      console.error('Create session failed:', err);
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      if (currentSessionId === sessionId) {
        const remaining = sessions.filter(s => s.id !== sessionId);
        const newCurrentId = remaining[0]?.id || null;
        setCurrentSessionId(newCurrentId);
        if (newCurrentId) {
          connectStream(newCurrentId);
        } else {
          eventSourceRef.current?.close();
        }
      }
    } catch (err) {
      console.error('Delete session failed:', err);
    }
  };

  // 切换会话
  const handleSwitchSession = async (sessionId: string) => {
    try {
      const session = await api.switchSession(sessionId);
      setSessions(prev => prev.map(s => s.id === sessionId ? session : s));
      setCurrentSessionId(sessionId);
      activeMessagesRef.current.clear();
      connectStream(sessionId);
    } catch (err) {
      console.error('Switch session failed:', err);
    }
  };

  // 从 prompt 中提取 @ 提及的 agent
  const extractMentionedCats = (prompt: string): string[] => {
    const catIds = agents.map(a => a.id);
    const mentioned: string[] = [];
    const regex = /@(\w+)/gi;
    let match;
    while ((match = regex.exec(prompt)) !== null) {
      const catId = match[1].toLowerCase();
      if (catIds.includes(catId) && !mentioned.includes(catId)) {
        mentioned.push(catId);
      }
    }
    return mentioned;
  };

  // 发送消息
  const handleSend = async (text: string) => {
    if (!currentSessionId || isRunning) return;

    // 清空上一轮的活动消息
    activeMessagesRef.current.clear();

    // 从 prompt 中提取 @ 提及的 agent，如果没有则使用所有 agent
    const mentionedCats = extractMentionedCats(text);
    const cats = mentionedCats.length > 0 ? mentionedCats : agents.map(a => a.id);

    if (cats.length === 0) {
      console.error('No agents available');
      return;
    }

    // 添加用户消息
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      ts: Date.now()
    };

    setSessions(prev => prev.map(session => {
      if (session.id !== currentSessionId) return session;
      return { ...session, messages: [...session.messages, userMsg] };
    }));

    // 保存用户消息到后端
    try {
      await api.addMessage(currentSessionId, 'user', text);
    } catch (err) {
      console.error('Add message failed:', err);
    }

    // 确保连接到正确的 thread
    connectStream(currentSessionId);

    // 执行任务
    setIsRunning(true);
    try {
      await api.runAgent({
        threadId: currentSessionId,
        cats,
        prompt: text
      });
    } catch (err) {
      console.error('Run agent failed:', err);
      setIsRunning(false);
    }
  };

  const formatTime = (date: Date | string | number) => {
    let d: Date;
    if (typeof date === 'number') {
      d = new Date(date);
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      return '';
    }
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return d.toLocaleDateString();
  };

  return (
    <DisplaySettingsProvider>
      <div className="h-screen w-screen flex flex-col font-sans overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-white/95 via-white/90 to-white/95 shrink-0 z-10 border-b border-primary/10 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-medium transition-all duration-300 hover:scale-110 hover:shadow-elevated cursor-pointer">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Chat Cafe</h1>
              <span className="text-[10px] bg-gradient-to-r from-primary/20 to-secondary/20 text-primary px-3 py-1 rounded-full font-semibold border border-primary/30 uppercase tracking-widest">Multi-Agent</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-foreground/80 bg-gradient-to-r from-muted/80 to-muted/40 px-4 py-2 rounded-full shadow-soft border border-border/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-medium">{sessions.length} 个会话</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <Group
            orientation="horizontal"
            style={{ height: '100%' }}
            resizeTargetMinimumSize={{ coarse: 20, fine: 10 }}
          >
            {/* Sessions Panel */}
            <Panel id="sessions" defaultSize="20%" minSize="15%" maxSize="35%">
              <div className="h-full flex flex-col bg-white/60">
                <div className="p-4 bg-white/80">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">会话列表</h2>
                    <button
                      onClick={handleCreateSession}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 cursor-pointer group"
                      title="创建新会话"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSwitchSession(session.id)}
                      className={`group p-3.5 rounded-2xl cursor-pointer transition-all duration-300 ${
                        currentSessionId === session.id
                          ? 'bg-gradient-to-r from-primary/15 to-secondary/10 shadow-medium border-l-[3px] border-primary'
                          : 'bg-white/70 hover:bg-white hover:shadow-soft border-l-[3px] border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                              currentSessionId === session.id
                                ? 'bg-gradient-to-br from-primary to-secondary shadow-sm'
                                : 'bg-slate-300'
                            }`} />
                            <div className="text-sm font-semibold text-foreground truncate">{session.title || '新会话'}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 ml-5">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">{session.messageCount || session.messages?.length || 0} 条消息</span>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">{formatTime(session.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer"
                          title="删除会话"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {sessions.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground text-sm">暂无会话</div>
                      <button
                        onClick={handleCreateSession}
                        className="mt-3 text-xs text-primary hover:text-primary-hover cursor-pointer"
                      >
                        创建第一个会话
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <Separator className="w-1.5 bg-muted hover:bg-primary transition-colors cursor-col-resize" />

            {/* Chat Panel */}
            <Panel id="chat" defaultSize="55%" minSize="40%">
              <div className="h-full flex flex-col relative bg-white/80">
                <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                  <div className="max-w-4xl mx-auto flex flex-col">
                    {messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        id={msg.id}
                        role={msg.role}
                        content={msg.content}
                        agentName={msg.agentName}
                        thoughtProcess={msg.thoughtProcess}
                        metrics={msg.metrics}
                      />
                    ))}
                    {isRunning && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Agent 正在思考...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 bg-white/80">
                  <div className="max-w-4xl mx-auto">
                    <Composer
                      onSend={handleSend}
                      agents={agents}
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Separator className="w-1.5 bg-muted hover:bg-primary transition-colors cursor-col-resize" />

            {/* Inspector Panel */}
            <Panel id="inspector" defaultSize="25%" minSize="15%" maxSize="40%">
              <div className="h-full bg-white/60 overflow-y-auto">
                <SidebarRight onOpenSettings={() => setIsSettingsOpen(true)} />
              </div>
            </Panel>
          </Group>
        </main>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </DisplaySettingsProvider>
  );
}

export default App;
