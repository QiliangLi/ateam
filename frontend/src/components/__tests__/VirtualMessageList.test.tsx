import { render, screen } from '@testing-library/react';
import { VirtualMessageList, estimateMessageHeight } from '../VirtualMessageList';

const mockMessages = Array.from({ length: 100 }, (_, i) => ({
  id: `msg-${i}`,
  role: (i % 2 === 0 ? 'user' : 'agent') as 'user' | 'agent',
  content: `This is message number ${i} with some content to test.`,
  agentName: i % 2 === 0 ? undefined : 'opus',
  thoughtProcess: i % 2 === 0 ? undefined : '> Thinking...',
  metrics: i % 2 === 0 ? undefined : { model: 'claude-3', ttfb: '0.5s', tokens: '100', cache: 'Hit' },
}));

describe('VirtualMessageList', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <VirtualMessageList messages={mockMessages.slice(0, 10)} height={500} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders only visible items (< 20 for 100 messages)', () => {
    const { container } = render(
      <VirtualMessageList messages={mockMessages} height={500} />
    );

    // react-window 使用虚拟滚动，实际渲染的 DOM 元素数量应该远小于消息总数
    // 计算实际渲染的 ChatMessage 组件数量
    const messageElements = container.querySelectorAll('[class*="flex w-full mb-8"]');
    const systemMessageElements = container.querySelectorAll('.bg-gray-100.text-gray-500');

    const totalRendered = messageElements.length + systemMessageElements.length;

    // 虚拟列表应该只渲染可见区域的消息（约500px高度，每条约80-120px）
    // 加上 overscanCount=5，应该不超过 20 条
    expect(totalRendered).toBeLessThan(20);
  });

  it('renders correctly with empty messages', () => {
    const { container } = render(
      <VirtualMessageList messages={[]} height={500} />
    );
    expect(container).toBeInTheDocument();
  });
});

describe('estimateMessageHeight', () => {
  it('calculates base height for short messages', () => {
    const shortMsg = {
      id: '1',
      role: 'user' as const,
      content: 'Short message',
    };
    const height = estimateMessageHeight(shortMsg);
    // baseHeight (80) + contentLines (1) * 20 = 100
    expect(height).toBe(100);
  });

  it('adds extra height for long messages', () => {
    const longMsg = {
      id: '1',
      role: 'user' as const,
      content: 'A'.repeat(200), // > 80 chars, should span multiple lines
    };
    const height = estimateMessageHeight(longMsg);
    // baseHeight (80) + contentLines (3) * 20 = 140
    expect(height).toBeGreaterThanOrEqual(120);
  });

  it('adds extra height for messages with thought process', () => {
    const msgWithThought = {
      id: '1',
      role: 'agent' as const,
      content: 'Some content',
      thoughtProcess: '> Thinking...',
    };
    const height = estimateMessageHeight(msgWithThought);
    // baseHeight (80) + contentLines (1) * 20 + thoughtHeight (60) = 160
    expect(height).toBe(160);
  });
});
