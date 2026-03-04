import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
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
            <div className="relative group rounded-md overflow-hidden bg-gray-900 border border-gray-800 my-4">
                <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/50">
                    <span className="text-xs font-mono text-gray-400">{match[1]}</span>
                    <button
                        onClick={copyToClipboard}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                        title="Copy code"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className="overflow-x-auto p-4">
                    <code className={cn("text-sm text-gray-100 font-mono", className)} {...props}>
                        {children}
                    </code>
                </div>
            </div>
        );
    }

    return (
        <code className={cn("bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md text-sm font-mono", className)} {...props}>
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
                <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex w-full mb-3 gap-3", isUser && "justify-end")}>
            {!isUser && (
                <div
                    className="w-7 h-7 rounded-lg bg-gray-100 border flex items-center justify-center shrink-0"
                    style={{ fontSize: 'var(--font-ui)' }}
                >
                    <span className="text-xs">🐱</span>
                </div>
            )}

            <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser && "items-end")}>
                {!isUser && agentName && (
                    <div className="text-sm font-medium text-gray-700">{agentName}</div>
                )}

                <div
                    className={cn(
                        "rounded-xl",
                        isUser ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border rounded-tl-sm shadow-sm"
                    )}
                    style={{
                        padding: `calc(var(--spacing-base) * 0.75)`,
                        fontSize: `var(--font-message)`
                    }}
                >
                    {thoughtProcess && !isUser && (
                        <Collapsible title="Thought Process" className="mb-4">
                            <div className="whitespace-pre-wrap">{thoughtProcess}</div>
                        </Collapsible>
                    )}

                    <div className={cn("prose prose-sm max-w-none break-words", isUser && "prose-invert")}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{ code: CodeBlock as any }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>

                {!isUser && metrics && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100">
                            {metrics.model}
                        </Badge>
                        <Badge variant="outline" className="text-gray-500 text-[10px]">
                            TTFB: {metrics.ttfb}
                        </Badge>
                        <Badge variant="outline" className="text-gray-500 text-[10px]">
                            Tokens: {metrics.tokens}
                        </Badge>
                        {metrics.cache && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">
                                {metrics.cache}
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {isUser && (
                <div
                    className="w-8 h-8 rounded-lg bg-blue-100 border-blue-200 border flex items-center justify-center shrink-0"
                    style={{ fontSize: 'var(--font-ui)' }}
                >
                    <span className="text-sm">👤</span>
                </div>
            )}
        </div>
    );
}
