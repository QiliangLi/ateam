import React from 'react';
import { Accordion } from './ui/Accordion';
import { Timeline, TimelineItem } from './ui/Timeline';
import { Settings, Info } from 'lucide-react';
import type { AgentStat } from '../hooks/useSessionStats';

interface SidebarRightProps {
    onOpenSettings: () => void;
    agentStats?: AgentStat[];
    timelineItems?: TimelineItem[];
}

export function SidebarRight({
    onOpenSettings,
    agentStats = [],
    timelineItems = []
}: SidebarRightProps) {
    // 计算总 token 数用于进度条
    const totalTokens = agentStats.reduce((sum, stat) => sum + stat.tokens, 0);
    const maxTokens = Math.max(totalTokens, 1000); // 避免除以零，设置最小基准

    // 动态生成统计项
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
                    {agentStats.length > 0 ? (
                        <>
                            {agentStats.map(stat => (
                                <div key={stat.id} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">{stat.id}</span>
                                    <span className="font-mono font-medium">
                                        {stat.tokens.toLocaleString()} tokens
                                    </span>
                                </div>
                            ))}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((totalTokens / maxTokens) * 100, 100)}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-xs text-gray-400">暂无统计数据</div>
                    )}
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
                    {timelineItems.length > 0
                        ? `已记录 ${timelineItems.length} 个会话事件`
                        : '暂无上下文记录'}
                </div>
            )
        }
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
                    {timelineItems.length > 0 ? (
                        <Timeline items={timelineItems} />
                    ) : (
                        <div className="text-xs text-gray-400 ml-6">暂无时间线记录</div>
                    )}
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Metrics Analytics</h4>
                    <Accordion items={statsItems} />
                </div>
            </div>
        </div>
    );
}
