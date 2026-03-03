import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Accordion({ items }: { items: { title: React.ReactNode, content: React.ReactNode }[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

    return (
        <div className="w-full border rounded-lg divide-y bg-white">
            {items.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                    <div key={i} className="overflow-hidden">
                        <button
                            onClick={() => toggle(i)}
                            className="flex items-center justify-between w-full p-4 font-medium text-sm text-left hover:bg-gray-50 transition-colors"
                        >
                            {item.title}
                            <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        <div
                            className={cn(
                                "grid transition-all duration-200 ease-in-out bg-gray-50/50",
                                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}
                        >
                            <div className="overflow-hidden">
                                <div className="p-4 pt-0 text-sm text-gray-600">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
