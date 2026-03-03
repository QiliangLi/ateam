import React, { useState, useRef, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { SidebarRight } from './components/SidebarRight';
import { SettingsModal } from './components/SettingsModal';
import { VirtualMessageList } from './components/VirtualMessageList';
import './index.css';

const MOCK_AGENTS = [
  { id: 'opus', display: 'opus' },
  { id: 'codex', display: 'codex' },
  { id: 'gemini', display: 'gemini' },
];

const INITIAL_MESSAGES = [
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
];

function App() {
  const [messages, setMessages] = useState<any[]>(INITIAL_MESSAGES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(500);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      setContainerHeight(messagesContainerRef.current.clientHeight);
    }
  }, []);

  const handleSend = (text: string) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }]);

    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        agentName: 'codex',
        content: 'Received your request.\n```javascript\nconsole.log("Hello Multi-Agent");\n```',
        metrics: { model: 'gpt-4o', ttfb: '0.4s', tokens: '89', cache: 'Miss' }
      }]);
    }, 1500);
  };

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      <header className="h-14 border-b flex items-center px-4 bg-white/80 backdrop-blur-md shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐱</span>
          <h1 className="font-semibold text-lg tracking-tight">Chat Cafe</h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={20} minSize={15} maxSize={30} className="bg-gray-50/50">
            <div className="h-full p-4 flex flex-col">
              <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Sessions</h2>
              <div className="p-3 bg-white border rounded-lg shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                <div className="text-sm font-medium text-gray-800">多猫协作优化会议</div>
                <div className="text-xs text-gray-400 mt-1">27 条消息</div>
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-gray-200 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          <Panel defaultSize={55} minSize={40}>
            <div className="h-full bg-white flex flex-col relative">
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                <div className="max-w-4xl mx-auto">
                  {messages.length > 50 ? (
                    <VirtualMessageList messages={messages} height={containerHeight} />
                  ) : (
                    <div className="flex flex-col gap-2">
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
                  )}
                </div>
              </div>

              <div className="p-4 bg-white/80 backdrop-blur-xl border-t">
                <div className="max-w-4xl mx-auto">
                  <Composer onSend={handleSend} agents={MOCK_AGENTS} />
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="w-1 bg-gray-200 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

          <Panel defaultSize={25} minSize={20} maxSize={40} className="bg-gray-50/50">
            <SidebarRight onOpenSettings={() => setIsSettingsOpen(true)} />
          </Panel>
        </Group>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
