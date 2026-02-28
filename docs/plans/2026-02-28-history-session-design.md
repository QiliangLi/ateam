# 历史对话记录功能设计文档

> 创建日期：2026-02-28

## 概述

实现历史对话记录功能，使用 localStorage 存储，在左侧侧边栏展示对话列表。

## 需求

### 功能需求
1. 会话存储到 localStorage
2. 左侧侧边栏展示对话列表
3. 搜索功能
4. 删除/重命名功能
5. 默认追加到当前会话，用户可创建新会话
6. 自动生成标题，用户可重命名

### 非功能需求
- 纯前端实现，不依赖后端
- 刷新页面后历史记录保留

## 技术方案

### 架构

```
web/
├── index.html      # 添加侧边栏 HTML 结构
├── styles.css      # 添加侧边栏样式
├── app.js          # 主应用逻辑（集成模块）
├── session-manager.js  # 会话存储管理
└── history-panel.js   # 侧边栏 UI 管理
```

### 数据结构

```javascript
// localStorage key: 'cat-cafe-sessions'
{
  sessions: [
    {
      id: 'session-uuid',
      title: '关于架构设计的讨论',
      createdAt: 1234567890,
      updatedAt: 1234567890,
      messages: [
        { role: 'user', content: '...', ts: 1234567890 },
        { role: 'opus', content: '...', ts: 1234567891 },
        ...
      ]
    }
  ],
  currentSessionId: 'session-uuid'
}
```

### 模块职责

**session-manager.js**：
- `createSession()` - 创建新会话
- `getCurrentSession()` - 获取当前会话
- `switchSession(id)` - 切换会话
- `addMessage(role, content)` - 添加消息到当前会话
- `renameSession(id, title)` - 重命名会话
- `deleteSession(id)` - 删除会话
- `searchSessions(query)` - 搜索会话
- `getAllSessions()` - 获取所有会话摘要

**history-panel.js**：
- `render(sessionList)` - 渲染会话列表
- `highlightCurrent(id)` - 高亮当前会话
- `bindEvents(handlers)` - 绑定事件处理

### UI 设计

```
┌──────────────────────────────────────────────────────┐
│  Cat Cafe Chat                          [已连接]    │
├────────────┬─────────────────────────────────────────┤
│ 🔍 搜索    │                                         │
│ ────────── │                                         │
│ + 新会话   │         消息区域                        │
│ ────────── │                                         │
│ 📝 架构设计│                                         │
│ 📝 测试讨论│                                         │
│ 📝 代码审查│                                         │
│            │                                         │
│            │                                         │
│            ├─────────────────────────────────────────┤
│            │ [输入框]                    [发送]      │
└────────────┴─────────────────────────────────────────┘
```

## 测试用例

### 单元测试
1. 创建会话，验证 localStorage 存储
2. 切换会话，验证 currentSessionId 更新
3. 添加消息，验证消息列表更新
4. 重命名会话，验证标题更新
5. 删除会话，验证会话移除
6. 搜索会话，验证搜索结果

### E2E 测试
1. 创建新会话，发送消息，刷新页面验证消息保留
2. 切换会话，验证消息正确显示
3. 搜索会话，验证搜索结果
4. 重命名会话，验证标题更新
5. 删除会话，验证会话移除

## 实现计划

1. 创建 `session-manager.js` 模块
2. 创建 `history-panel.js` 模块
3. 修改 `index.html` 添加侧边栏结构
4. 修改 `styles.css` 添加侧边栏样式
5. 修改 `app.js` 集成模块
6. 编写 E2E 测试
