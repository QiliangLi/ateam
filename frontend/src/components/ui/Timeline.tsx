import React from 'react';
import { cn } from '../../lib/utils';

export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    status: 'active' | 'completed' | 'pending';
    icon?: React.ReactNode;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
    return (
        <div className="relative border-l border-border ml-3">
            {items.map((item, i) => (
                <div key={item.id} className="mb-6 ml-6 last:mb-0">
                    <span
                        className={cn(
                            "absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-background",
                            item.status === 'active' ? "bg-primary/20 text-primary" :
                                item.status === 'completed' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        )}
                    >
                        {item.icon ? (
                            <div className="w-3 h-3 flex items-center justify-center">{item.icon}</div>
                        ) : (
                            <div
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full",
                                    item.status === 'active' ? "bg-primary" :
                                        item.status === 'completed' ? "bg-success" : "bg-muted-foreground/50"
                                )}
                            />
                        )}
                    </span>
                    <h3 className="flex items-center mb-1 font-medium text-foreground text-sm">{item.title}</h3>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                </div>
            ))}
        </div>
    );
}
