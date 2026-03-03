import React from 'react';
import { Accordion } from './ui/Accordion';
import { Timeline, TimelineItem } from './ui/Timeline';
import { Settings, Info } from 'lucide-react';

export function SidebarRight({ onOpenSettings }: { onOpenSettings: () => void }) {
    const statsItems = [
        {
            title: (
                <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>Agent Consumption Stats</span>
                </div>
            ),
            content: (
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">@opus</span>
                        <span className="font-mono font-medium">1,245 tokens</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">@gemini</span>
                        <span className="font-mono font-medium">850 tokens</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                </div>
            )
        },
        {
            title: (
                <div className="flex items-center gap-2">
                    <span>🧠</span>
                    <span>Context Memory</span>
                </div>
            ),
            content: (
                <div className="text-xs text-gray-500">
                    Memory usage is stable. 12 previous turns loaded in active context buffer.
                </div>
            )
        }
    ];

    const timelineItems: TimelineItem[] = [
        { id: '1', title: 'User Input', description: 'Received Markdown request', status: 'completed' },
        { id: '2', title: '@opus router', description: 'Delegated task to UI expert', status: 'completed' },
        { id: '3', title: '@gemini rendering', description: 'Generating React code...', status: 'active' },
        { id: '4', title: 'Final Aggregation', status: 'pending' },
    ];

    return (
        <div className="h-full flex flex-col pt-2 pb-6 px-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Inspector
                </h3>
                <button
                    onClick={onOpenSettings}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Settings & Presets"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Session Chain</h4>
                    <Timeline items={timelineItems} />
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Metrics Analytics</h4>
                    <Accordion items={statsItems} />
                </div>
            </div>
        </div>
    );
}
