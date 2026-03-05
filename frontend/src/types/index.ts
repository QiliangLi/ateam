/**
 * 前后端数据类型定义
 */

// Agent/猫猫配置
export interface Cat {
  id: string;           // 'opus' | 'codex' | 'gemini'
  cli: string;          // CLI 类型
  name: string;         // 显示名称
  alias: string;        // 别名
  mentionPatterns: string[];
  persona: string;
}

// 消息
export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentName?: string;        // agent ID（如 'opus'）
  thoughtProcess?: string;   // 思考过程
  metrics?: {
    model: string;
    ttfb: string;
    tokens: string;
    cache: string;
  };
  ts?: number;               // 时间戳
}

// 会话
export interface Session {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  messages: Message[];
  totalMessages?: number;    // 分页时的总数
}

// Bootstrap 响应
export interface BootstrapResponse {
  apiUrl: string;
  invocationId: string;
  callbackToken: string;
  cats: string[];            // cat ID 列表
}

// SSE 事件类型
export type SSEEventType = 'status' | 'cli' | 'message' | 'system' | 'thinking' | 'tool_call' | 'metrics';

// SSE 事件
export interface SSEEvent {
  type: SSEEventType;
  catId?: string;
  status?: string;
  detail?: string;
  text?: string;
  content?: string;
  message?: string;
  thinking?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  metrics?: {
    cost_usd?: number;
    duration_ms?: number;
    duration_api_ms?: number;
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    num_sessions?: number;
    total_cost_usd?: number;
    total_tokens?: number;
  };
  ts?: number;
}

// Run 请求
export interface RunRequest {
  threadId: string;
  cats: string[];
  prompt: string;
}

// API 响应
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}
