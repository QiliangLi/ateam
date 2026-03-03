import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredAgents = agents.filter(a =>
        a.display.toLowerCase().includes(popoverFilter.toLowerCase())
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setValue(newVal);

        // Check if "@" was just typed
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
        if (value.trim()) {
            onSend(value);
            setValue('');
        }
    };

    // Auto-grow textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [value]);

    return (
        <div className="relative border border-gray-200 rounded-xl bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
            {/* @ Mention Popover */}
            {showPopover && filteredAgents.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                    {filteredAgents.map((agent, i) => (
                        <button
                            key={agent.id}
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                                i === selectedIdx ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                            )}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(agent); }}
                        >
                            <span className="text-base">🤖</span>
                            <span className="font-medium">@{agent.display}</span>
                        </button>
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or @ to mention an agent..."
                rows={1}
                className="w-full px-4 py-3 text-sm text-gray-800 bg-transparent outline-none resize-none placeholder-gray-400"
                style={{ minHeight: '44px', maxHeight: '200px' }}
            />

            {/* Footer controls */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <Paperclip className="w-4 h-4" />
                </button>
                <button
                    onClick={handleSend}
                    disabled={!value.trim()}
                    className={cn(
                        "p-1.5 rounded-lg transition-colors flex items-center justify-center",
                        value.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400"
                    )}
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
