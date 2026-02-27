# 流式输出功能设计文档

> 创建日期：2026-02-28

## 概述

实现 agent 流式输出功能，包括：
1. 思考占位符 - agent 开始输出前显示 "xxx 正在思考..."
2. 消息合并 - 同一 agent 的多个 chunk 追加到同一条消息
3. 并行显示 - 多个 agent 同时显示各自的消息

## 需求

### 用户需求
- agent 接收到消息后立刻显示占位符
- agent 输出时流式追加内容（像 ChatGPT 打字效果）
- 多个 agent 并行执行时各自显示独立消息

### 测试用例
1. 单个 agent 流式输出
2. 多个 agent 并行输出
3. 同一 agent 的多个 chunk 合并
4. A2A 触发后新消息
5. A2A 通信时上下文正确传递

## 技术方案

### 方案选择：前端追加模式

**理由**：
- 改动最小，只改前端
- 后端 SSE 已经实时发送 chunk
- 不需要引入新的协议

### 数据结构

```javascript
// web/app.js
const activeMessages = new Map(); // catId -> { row, content, isThinking, fullText }
```

### 核心函数

| 函数 | 说明 |
|------|------|
| `ensureMessage(catId)` | 确保 agent 有消息元素，没有则创建占位符 |
| `appendChunk(catId, text)` | 追加 chunk 到 agent 的消息中 |
| `resetMessage(catId)` | agent 完成后重置，下次输出创建新消息 |
| `clearActiveMessages()` | 清空所有活动消息（用于新一轮对话） |

### 消息流程

```
用户发送消息
    ↓
为选中的 agent 创建 "xxx 正在思考..." 占位符
    ↓
后端 SSE 发送 { type: 'cli', catId, text }
    ↓
前端 appendChunk() 追加内容，移除占位符
    ↓
后端发送 { type: 'system', message: '执行完成' }
    ↓
前端 clearActiveMessages()，准备下一轮
```

## 文件改动

| 文件 | 改动 |
|------|------|
| `web/app.js` | 新增流式输出逻辑 |
| `tests/e2e/streaming-output.spec.js` | 新增测试用例 |

## 测试结果

- 11/11 Playwright E2E 测试通过

## 后续优化

- [ ] 支持取消正在执行的 agent
- [ ] 显示执行进度百分比
- [ ] 支持 Markdown 渲染
