import { useRef, useCallback } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentName?: string;
  thoughtProcess?: string;
  metrics?: {
    model: string;
    ttfb: string;
    tokens: string;
    cache: string;
  };
}

interface VirtualMessageListProps {
  messages: Message[];
  height: number;
}

// 估算消息高度的辅助函数
// 基础高度 80px + 每行约 20px (假设每行80字符)
// 如果有思考过程，额外增加 60px
export function estimateMessageHeight(msg: Message): number {
  const baseHeight = 80;
  const contentLines = Math.ceil(msg.content.length / 80);
  const contentHeight = contentLines * 20;
  const thoughtHeight = msg.thoughtProcess ? 60 : 0;

  return baseHeight + contentHeight + thoughtHeight;
}

const Row = ({ index, style, data }: ListChildComponentProps<Message[]>) => {
  const msg = data[index];

  return (
    <div style={style}>
      <ChatMessage
        id={msg.id}
        role={msg.role}
        content={msg.content}
        agentName={msg.agentName}
        thoughtProcess={msg.thoughtProcess}
        metrics={msg.metrics}
      />
    </div>
  );
};

export function VirtualMessageList({ messages, height }: VirtualMessageListProps) {
  const listRef = useRef<List>(null);

  // 获取每个项目的尺寸
  const getItemSize = useCallback((index: number) => {
    return estimateMessageHeight(messages[index]);
  }, [messages]);

  // 消息更新时重置列表
  const prevMessagesLength = useRef(messages.length);
  if (prevMessagesLength.current !== messages.length) {
    // 重置后滚动到底部
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
      setTimeout(() => {
        listRef.current?.scrollToItem(messages.length - 1);
      }, 0);
    }
    prevMessagesLength.current = messages.length;
  }

  return (
    <List
      ref={listRef}
      height={height}
      itemCount={messages.length}
      itemSize={getItemSize}
      itemData={messages}
      width="100%"
      overscanCount={5} // 预渲染额外5项
    >
      {Row}
    </List>
  );
}
