import React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
            <div className="z-50 w-full max-w-lg p-6 glass-strong rounded-xl shadow-lg relative animate-in zoom-in-95 duration-200 slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
}
