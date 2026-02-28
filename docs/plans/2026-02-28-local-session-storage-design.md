# 会话本地存储设计文档

> 创建日期：2026-02-28

## 概述

将历史会话从浏览器 localStorage 迁移到服务器本地文件存储。

## 目标

1. **解决容量问题** - localStorage 有 5-10MB 限制
2. **跨浏览器/设备同步** - 同一用户在不同设备看到相同历史
3. **数据持久化更可靠** - 避免浏览器清理导致数据丢失

## 技术方案

### 存储方案：后端 API + JSON 文件

```
前端 → REST API → 后端 → data/sessions/*.json
```

### 数据存储结构

**目录**：`data/sessions/`

**文件格式**：
```
data/sessions/
├── session-1709123456789-abc123.json  # 会话文件
├── session-1709123456790-def456.json
└── index.json  # 会话索引
```

**会话文件结构**：
```json
{
  "id": "session-1709123456789-abc123",
  "title": "关于架构设计的讨论",
  "createdAt": 1709123456789,
  "updatedAt": 1709123456999,
  "messages": [
    { "role": "user", "content": "...", "ts": 1709123456800 },
    { "role": "opus", "content": "...", "ts": 1709123456900 }
  ]
}
```

**索引文件 `index.json`**：
```json
{
  "sessions": [
    { "id": "session-xxx", "title": "...", "updatedAt": 1709123456999, "messageCount": 15 }
  ],
  "currentSessionId": "session-xxx"
}
```

### 消息条数策略

- **后端存储**：不限制，完整保留历史
- **前端默认加载**：最近 500 条消息
- **分页加载**：支持"加载更早的消息"

### 后端 API

| API | 方法 | 说明 |
|-----|------|------|
| `/api/sessions` | GET | 获取会话列表 |
| `/api/sessions` | POST | 创建新会话 |
| `/api/sessions/:id` | GET | 获取会话详情（默认最近 500 条消息） |
| `/api/sessions/:id` | PUT | 更新会话（重命名等） |
| `/api/sessions/:id` | DELETE | 删除会话 |
| `/api/sessions/:id/messages` | GET | 分页获取消息（`?before=ts&limit=500`） |

### 前端改动

**移除**：
- `session-manager.js` 中的 localStorage 调用

**新增**：
- 调用后端 API 的函数
- "加载更早的消息"按钮和逻辑

**改动文件**：
- `web/session-manager.js` - 改为调用 API
- `web/app.js` - 集成新的会话管理
- `web/index.html` - 添加"加载更早"按钮
- `web/styles.css` - 按钮样式

### 新增文件

```
server/
└── utils/
    └── session-store.js  # 会话文件读写工具

data/
└── sessions/  # 会话存储目录
```

## 实现计划

1. 创建 `server/utils/session-store.js` - 会话文件读写
2. 在 `chat-server.js` 添加 sessions API
3. 创建 `data/sessions/` 目录
4. 修改 `web/session-manager.js` - 调用 API
5. 修改 `web/app.js` - 集成新会话管理
6. 添加"加载更早"功能
7. 编写 E2E 测试
