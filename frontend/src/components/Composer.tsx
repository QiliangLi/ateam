import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ComposerProps {
    onSend: (message: string) => void;
    agents: { id: string; display: string }[];
}

export function Composer({ onSend, agents }: ComposerProps) {
    const [value, setValue] = useState('');
    const [showPopover, setShowPopover] = useState(false);
    const [popoverFilter, setPopoverFilter] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredAgents = agents.filter(a =>
        a.display.toLowerCase().includes(popoverFilter.toLowerCase())
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setValue(newVal);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = newVal.slice(0, cursorPos);
        const atIdx = textBeforeCursor.lastIndexOf('@');

        if (atIdx !== -1 && (atIdx === 0 || textBeforeCursor[atIdx - 1] === ' ' || textBeforeCursor[atIdx - 1] === '\n')) {
            const query = textBeforeCursor.slice(atIdx + 1);
            if (!query.includes(' ')) {
                setPopoverFilter(query);
                setShowPopover(true);
                setSelectedIdx(0);
                return;
            }
        }
        setShowPopover(false);
    };

    const insertMention = (agent: { id: string; display: string }) => {
        const cursorPos = textareaRef.current?.selectionStart || value.length;
        const textBeforeCursor = value.slice(0, cursorPos);
        const atIdx = textBeforeCursor.lastIndexOf('@');
        const before = value.slice(0, atIdx);
        const after = value.slice(cursorPos);
        const newValue = `${before}@${agent.display} ${after}`;
        setValue(newValue);
        setShowPopover(false);

        setTimeout(() => {
            const newPos = before.length + agent.display.length + 2;
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showPopover && filteredAgents.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.min(prev + 1, filteredAgents.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((prev) => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                insertMention(filteredAgents[selectedIdx]);
                return;
            }
            if (e.key === 'Escape') {
                setShowPopover(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey && !showPopover) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (value.trim() && !isSending) {
            setIsSending(true);
            onSend(value);
            setValue('');
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [value]);

    return (
        <div className="relative bg-white rounded-2xl shadow-soft card-border">
            {/* @ Mention Popover */}
            {showPopover && filteredAgents.length > 0 && (
                <div className="absolute bottom-full left-4 mb-3 w-60 bg-white rounded-xl shadow-elevated overflow-hidden z-50 border border-border/50">
                    {filteredAgents.map((agent, i) => (
                        <button
                            key={agent.id}
                            className={cn(
                                "w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-all duration-200 cursor-pointer",
                                i === selectedIdx
                                    ? "bg-primary text-white"
                                    : "hover:bg-primary-hover text-white"
                            )}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(agent); }}
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-soft">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-foreground">@{agent.display}</span>
                                <span className="text-xs text-muted-foreground">AI Agent</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="输入消息或 @ 提及 AI..."
                rows={1}
                disabled={isSending}
                className="w-full px-4 py-3.5 text-sm text-foreground bg-transparent outline-none resize-none placeholder-muted-foreground transition-all duration-200 focus:ring disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '200px', fontSize: 'var(--font-message)' }}
            />

            {/* Footer controls */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 rounded-b-2xl">
                <button className="icon-btn focus-ring" title="添加附件">
                    <Paperclip className="w-4 h-4" />
                </button>
                <button
                    onClick={handleSend}
                    disabled={!value.trim() || isSending}
                    className={cn(
                        "btn-interactive p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center focus-ring",
                        value.trim() && !isSending
                            ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-soft"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
