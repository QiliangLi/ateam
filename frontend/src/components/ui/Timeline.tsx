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
        <div className="relative border-l border-gray-200 ml-3">
            {items.map((item, i) => (
                <div key={item.id} className="mb-6 ml-6 last:mb-0">
                    <span
                        className={cn(
                            "absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white",
                            item.status === 'active' ? "bg-blue-100 text-blue-600" :
                                item.status === 'completed' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                        )}
                    >
                        {item.icon ? (
                            <div className="w-3 h-3 flex items-center justify-center">{item.icon}</div>
                        ) : (
                            <div
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full",
                                    item.status === 'active' ? "bg-blue-600" :
                                        item.status === 'completed' ? "bg-green-600" : "bg-gray-400"
                                )}
                            />
                        )}
                    </span>
                    <h3 className="flex items-center mb-1 font-medium text-gray-900 text-sm">{item.title}</h3>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                </div>
            ))}
        </div>
    );
}
