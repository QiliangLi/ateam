import React from 'react';
import { Accordion } from './ui/Accordion';
import { Timeline, TimelineItem } from './ui/Timeline';
import { Settings, Info, BarChart3, Brain, from 'lucide-react';

export function SidebarRight({ onOpenSettings }: { onOpenSettings: () => void }) {
    const statsItems = [
        {
            title: (
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span>Agent Consumption Stats</span>
                </div>
            ),
            content: (
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">@opus</span>
                        <span className="font-mono font-medium">{metrics.tokens} tokens</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5 mt-2">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: '65%' }}></div>
                </div>
            )
        },
        {
            title: (
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-secondary" />
                    <span>Context Memory</span>
                </div>
            ),
            content: (
                <div className="text-xs text-muted-foreground">
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
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span>Inspector</span>
                </button>
                <button
                    onClick={onOpenSettings}
                    className="icon-btn focus-ring"
                    title="设置"
                >
                    <Settings className="w-4 h-4" />
            </button>
        </div>

        <div className="space-y-6">
            <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Session链</h4>
            <div>
                <Timeline items={timelineItems} />
            </div>

            <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Metrics Analytics</h4>
                <Accordion items={statsItems} />
            </div>
        </div>
    );
}
