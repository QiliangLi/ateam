import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionStats } from '../useSessionStats';

describe('useSessionStats', () => {
    it('初始状态应为空数组', () => {
        const { result } = renderHook(() => useSessionStats());

        expect(result.current.agentStats).toEqual([]);
        expect(result.current.timelineItems).toEqual([]);
    });

    it('addAgentStat 应添加新的 agent 统计', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addAgentStat('@opus', 1000);
        });

        expect(result.current.agentStats).toHaveLength(1);
        expect(result.current.agentStats[0]).toEqual({ id: '@opus', tokens: 1000 });
    });

    it('addAgentStat 应更新已存在的 agent 统计', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addAgentStat('@opus', 1000);
            result.current.addAgentStat('@opus', 1500);
        });

        expect(result.current.agentStats).toHaveLength(1);
        expect(result.current.agentStats[0]).toEqual({ id: '@opus', tokens: 1500 });
    });

    it('addAgentStat 应支持多个 agent', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addAgentStat('@opus', 1000);
            result.current.addAgentStat('@gemini', 850);
            result.current.addAgentStat('@codex', 500);
        });

        expect(result.current.agentStats).toHaveLength(3);
        expect(result.current.agentStats).toEqual([
            { id: '@opus', tokens: 1000 },
            { id: '@gemini', tokens: 850 },
            { id: '@codex', tokens: 500 }
        ]);
    });

    it('addTimelineItem 应添加新的时间线项', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addTimelineItem({
                title: 'Test Task',
                description: 'Test description',
                status: 'pending'
            });
        });

        expect(result.current.timelineItems).toHaveLength(1);
        expect(result.current.timelineItems[0].title).toBe('Test Task');
        expect(result.current.timelineItems[0].description).toBe('Test description');
        expect(result.current.timelineItems[0].status).toBe('pending');
        expect(result.current.timelineItems[0].id).toMatch(/^timeline-/);
    });

    it('addTimelineItem 应支持不包含 description 的项', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addTimelineItem({
                title: 'Simple Task',
                status: 'completed'
            });
        });

        expect(result.current.timelineItems).toHaveLength(1);
        expect(result.current.timelineItems[0].description).toBeUndefined();
    });

    it('updateTimelineItemStatus 应更新指定项的状态', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addTimelineItem({
                title: 'Task 1',
                status: 'pending'
            });
        });

        const id = result.current.timelineItems[0].id;

        act(() => {
            result.current.updateTimelineItemStatus(id, 'completed');
        });

        expect(result.current.timelineItems[0].status).toBe('completed');
    });

    it('reset 应清空所有数据', () => {
        const { result } = renderHook(() => useSessionStats());

        act(() => {
            result.current.addAgentStat('@opus', 1000);
            result.current.addTimelineItem({
                title: 'Task',
                status: 'active'
            });
        });

        expect(result.current.agentStats).toHaveLength(1);
        expect(result.current.timelineItems).toHaveLength(1);

        act(() => {
            result.current.reset();
        });

        expect(result.current.agentStats).toEqual([]);
        expect(result.current.timelineItems).toEqual([]);
    });
});
