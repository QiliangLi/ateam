import { useState, useCallback } from 'react';

export interface AgentStat {
    id: string;
    tokens: number;
}

export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'active' | 'completed';
}

interface SessionStatsState {
    agentStats: AgentStat[];
    timelineItems: TimelineItem[];
}

export function useSessionStats() {
    const [state, setState] = useState<SessionStatsState>({
        agentStats: [],
        timelineItems: []
    });

    const addAgentStat = useCallback((agentId: string, tokens: number) => {
        setState(prev => {
            const existingIndex = prev.agentStats.findIndex(s => s.id === agentId);
            if (existingIndex >= 0) {
                // Update existing stat
                const newStats = [...prev.agentStats];
                newStats[existingIndex] = { id: agentId, tokens };
                return { ...prev, agentStats: newStats };
            }
            // Add new stat
            return {
                ...prev,
                agentStats: [...prev.agentStats, { id: agentId, tokens }]
            };
        });
    }, []);

    const addTimelineItem = useCallback((item: Omit<TimelineItem, 'id'>) => {
        const id = `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setState(prev => ({
            ...prev,
            timelineItems: [...prev.timelineItems, { ...item, id }]
        }));
    }, []);

    const updateTimelineItemStatus = useCallback((id: string, status: TimelineItem['status']) => {
        setState(prev => ({
            ...prev,
            timelineItems: prev.timelineItems.map(item =>
                item.id === id ? { ...item, status } : item
            )
        }));
    }, []);

    const reset = useCallback(() => {
        setState({
            agentStats: [],
            timelineItems: []
        });
    }, []);

    return {
        agentStats: state.agentStats,
        timelineItems: state.timelineItems,
        addAgentStat,
        addTimelineItem,
        updateTimelineItemStatus,
        reset
    };
}
