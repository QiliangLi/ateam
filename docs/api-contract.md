# API 接口契约

> 前后端协作边界。后端实现这些接口，前端调用这些接口。

## Base URL
- WebSocket: `ws://localhost:3000`
- MCP 回调: `http://localhost:3001/callback`

---

## 1. WebSocket 消息

### 客户端 → 服务端

```typescript
// 用户消息
{
  type: "message",
  content: "@布偶猫 你好",
  threadId: "thread-123"
}

// 猫猫消息（A2A）
{
  type: "a2a_message",
  from: "ragdoll",  // 布偶猫
  to: "maine-coon", // 缅因猫
  content: "@缅因猫 帮我 review 一下",
  threadId: "thread-123"
}
```

### 服务端 → 客户端

```typescript
// 猫猫状态更新
{
  type: "status",
  catId: "ragdoll",
  status: "thinking" | "tool_call" | "replying" | "idle"
}

// 猫猫回复
{
  type: "reply",
  catId: "ragdoll",
  content: "好的，让我来看看...",
  threadId: "thread-123"
}

// Token 消耗
{
  type: "token_usage",
  catId: "ragdoll",
  input: 1234,
  output: 567,
  budget: 150000
}
```

---

## 2. MCP 回调接口

### 消息回传

`POST /callback/message`

```typescript
{
  sessionId: "session-123",
  catId: "ragdoll",
  content: "这是猫猫主动发的消息"
}
```

### 状态更新

`POST /callback/status`

```typescript
{
  sessionId: "session-123",
  catId: "ragdoll",
  status: "thinking" | "tool_call" | "replying" | "idle"
}
```

---

## 3. 猫猫配置

```typescript
interface CatConfig {
  id: string;           // "ragdoll" | "maine-coon" | "siamese"
  name: string;         // "布偶猫" | "缅因猫" | "暹罗猫"
  alias: string[];      // ["宪宪", "布偶"]
  model: string;        // "claude-opus-4-6"
  contextBudget: number;// 150000
  persona: string;      // 人格描述
  tools: string[];      // 可用工具列表
}
```

---

## 4. @提及解析

```typescript
// 输入
parse_mentions("@布偶猫 你好 @缅因猫", {
  "布偶猫": "ragdoll",
  "缅因猫": "maine-coon",
  "宪宪": "ragdoll",
  "砚砚": "maine-coon"
})

// 输出
["ragdoll", "maine-coon"]
```

---

## 5. A2A 路由

```typescript
// 路由规则
interface A2ARoute {
  from: string;    // 发送方猫猫 ID
  to: string;      // 接收方猫猫 ID
  message: string; // 消息内容
  context: {       // 上下文
    threadId: string;
    messages: Message[];
  }
}
```

---

> **注意**：本文档随功能开发持续更新。详见 `docs/ROADMAP.md` 中的功能规划。
