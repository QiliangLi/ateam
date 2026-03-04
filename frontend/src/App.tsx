import React, { useState, useRef, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Plus, MessageSquare, Trash2, Sparkles } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { SidebarRight } from './components/SidebarRight';
import { SettingsModal } from './components/SettingsModal';
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext';
import './index.css';

const MOCK_AGENTS = [
  { id: 'opus', display: 'opus' },
  { id: 'codex', display: 'codex' },
  { id: 'gemini', display: 'gemini' },
];

interface Session {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  messages: any[];
}

const createNewSession = (): Session => ({
  id: `session-${Date.now()}`,
  title: '新会话',
  messageCount: 0,
  createdAt: new Date(),
  messages: [
    {
      id: '1',
      role: 'system' as const,
      content: '新会话已创建。开始对话吧！',
    }
  ]
});

const INITIAL_SESSIONS: Session[] = [
  {
    id: 'session-1',
    title: '多猫协作优化会议',
    messageCount: 27,
    createdAt: new Date(Date.now() - 3600000),
    messages: [
      {
        id: '1',
        role: 'system' as const,
        content: 'Chat Cafe multi-agent session started.',
      },
      {
        id: '2',
        role: 'user' as const,
        content: '你和小伙伴讨论一下目前的前端设计是否可以继续被优化？',
      },
      {
        id: '3',
        role: 'agent' as const,
        agentName: 'opus',
        thoughtProcess: '> 分析当前页面布局...\n> 识别所需优化点...',
        content: '我们完全可以通过 **React** 和 **Tailwind** 重写前端架构。\n\n```css\n.glass-panel {\n  backdrop-filter: blur(20px);\n  background: rgba(255, 255, 255, 0.7);\n}\n```',
        metrics: { model: 'claude-3-opus', ttfb: '0.8s', tokens: '412', cache: 'Hit' },
      }
    ]
  }
];

function App() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState<string>(INITIAL_SESSIONS[0]?.id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateSession = () => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setCurrentSessionId(remaining[0]?.id || '');
    }
  };

  const handleSend = (text: string) => {
    if (!currentSessionId) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: text,
    };

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: [...session.messages, userMessage],
          messageCount: session.messages.length + 1,
        };
      }
      return session;
    }));

    setTimeout(() => {
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent' as const,
        agentName: 'codex',
        content: '收到你的请求，正在处理中...\n\n```javascript\nconsole.log("Hello Multi-Agent");\n```',
        metrics: { model: 'gpt-4o', ttfb: '0.4s', tokens: '89', cache: 'Miss' }
      };

      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, agentMessage],
            messageCount: session.messages.length + 2,
          };
        }
        return session;
      }));
    }, 1500);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    return date.toLocaleDateString();
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
                      onClick={() => setCurrentSessionId(session.id)}
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
                            <div className="text-sm font-semibold text-foreground truncate">{session.title}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 ml-5">
                            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">{session.messageCount} 条消息</span>
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
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-4 bg-white/80">
                  <div className="max-w-4xl mx-auto">
                    <Composer onSend={handleSend} agents={MOCK_AGENTS} />
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
