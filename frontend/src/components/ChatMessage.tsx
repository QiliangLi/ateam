import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Bot, User } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Collapsible } from './ui/Collapsible';
import { cn } from '../lib/utils';

interface ChatMessageProps {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    agentName?: string;
    thoughtProcess?: string;
    metrics?: {
        model: string;
        ttfb: string;
        tokens: string;
        cache: string;
    };
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);
    const codeString = String(children).replace(/\n$/, '');

    const copyToClipboard = () => {
        navigator.clipboard.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && match) {
        return (
            <div className="my-4 rounded-xl overflow-hidden bg-slate-900 shadow-medium border border-slate-700/50">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
                    <span className="text-xs font-mono font-medium text-teal-400 bg-teal-400/10 px-2 py-1 rounded">
                        {match[1]}
                    </span>
                    <button
                        onClick={copyToClipboard}
                        className={cn(
                            "p-1.5 rounded-md transition-all duration-200 cursor-pointer",
                            copied
                                ? "text-emerald-400 bg-emerald-400/10"
                                : "text-slate-400 hover:text-white hover:bg-slate-700"
                        )}
                        title={copied ? "已复制!" : "复制代码"}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <code
                        className="text-sm text-slate-100 font-mono leading-relaxed"
                        style={{ fontSize: 'var(--font-message)' }}
                        {...props}
                    >
                        {children}
                    </code>
                </div>
            </div>
        );
    }

    return (
        <code
            className="inline-code"
            {...props}
        >
            {children}
        </code>
    );
};

export function ChatMessage({ role, content, agentName, thoughtProcess, metrics }: ChatMessageProps) {
    const isUser = role === 'user';
    const isSystem = role === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-4">
                <div className="bg-muted text-muted-foreground text-xs px-4 py-1.5 rounded-full shadow-soft">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn("flex w-full gap-3", isUser && "justify-end")}
            style={{ marginBottom: 'var(--spacing-base)' }}
        >
            {!isUser && (
                <div
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-soft transition-transform duration-200 hover:scale-105"
                    style={{ fontSize: 'var(--font-ui)' }}
                >
                    <Bot className="w-5 h-5 text-white" />
                </div>
            )}

            <div className={cn("flex flex-col gap-1.5 max-w-[85%]", isUser && "items-end")}>
                {!isUser && agentName && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{agentName}</span>
                        <span className="text-xs text-muted-foreground">AI Agent</span>
                    </div>
                )}

                <div
                    className={cn(
                        "rounded-2xl transition-all duration-200",
                        isUser
                            ? "bg-gradient-to-br from-primary to-primary-hover text-white shadow-medium"
                            : "bg-white/90 backdrop-blur-sm border border-slate-200/50 shadow-soft"
                    )}
                    style={{
                        padding: `calc(var(--spacing-base) * 1.5)`,
                        fontSize: `var(--font-message)`
                    }}
                >
                    {thoughtProcess && !isUser && (
                        <Collapsible title="Thought Process" className="mb-3">
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {thoughtProcess}
                            </div>
                        </Collapsible>
                    )}

                    <div className={cn(
                        "prose prose-sm max-w-none break-words",
                        isUser && "prose-invert",
                        !isUser && "prose-slate"
                    )}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{ code: CodeBlock as any }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                {!isUser && metrics && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
                            {metrics.model}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">
                            TTFB: {metrics.ttfb}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">
                            {metrics.tokens} tokens
                        </Badge>
                        {metrics.cache && (
                            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 text-[10px] font-medium">
                                {metrics.cache}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {isUser && (
                <div
                    className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 shadow-soft transition-transform duration-200 hover:scale-105"
                    style={{ fontSize: 'var(--font-ui)' }}
                >
                    <User className="w-5 h-5 text-accent" />
                </div>
            )}
        </div>
    );
}
