# 代码导航地图

> 快速定位功能对应的代码文件

## 项目结构

```
ateam/
├── server/                 # 后端核心代码（Node.js）
│   ├── index.js            # 主入口
│   ├── servers/            # HTTP/WebSocket 服务器
│   ├── a2a/                # Agent-to-Agent 路由
│   ├── cli/                # AI CLI 封装
│   ├── mcp/                # MCP 服务
│   ├── config/             # 配置文件
│   ├── utils/              # 工具函数
│   └── scripts/            # 命令行脚本
├── web/                    # 前端代码
├── tests/                  # 测试代码
├── docs/                   # 文档
├── logs/                   # 日志目录
└── .sessions/              # Session 数据
```

## 核心功能 → 代码映射

### 🖥️ 服务器入口

| 功能 | 文件 | 说明 |
|------|------|------|
| 主入口 | `server/index.js` | 启动聊天/回调服务器 |
| 聊天服务器 | `server/servers/chat-server.js` | WebSocket 聊天 + SSE 推送 |
| 回调服务器 | `server/servers/callback-server.js` | MCP 回调 HTTP 服务 |

### 🐱 猫猫配置

| 功能 | 文件 | 说明 |
|------|------|------|
| 猫猫配置 | `server/config/cats.js` | 三只猫的定义（布偶/缅因/暹罗）|

### 🔀 A2A 路由

| 功能 | 文件 | 说明 |
|------|------|------|
| 消息路由 | `server/a2a/router.js` | Agent-to-Agent 消息分发 |
| 注册中心 | `server/a2a/registry.js` | 工作队列管理 |
| @提及解析 | `server/a2a/mentions.js` | 解析消息中的 @提及 |

### 🤖 AI CLI 核心

| 功能 | 文件 | 说明 |
|------|------|------|
| CLI 封装 | `server/cli/ai-cli.js` | 对接 Claude/Codex/Gemini CLI |
| 进程管理 | `server/cli/ai-cli.js` | 子进程启动、输出解析、Session 管理 |

### 🔧 MCP 服务

| 功能 | 文件 | 说明 |
|------|------|------|
| MCP 入口 | `server/mcp/server.js` | MCP 服务入口（cat_cafe_post_message 等工具）|
| Prompt 生成 | `server/mcp/prompt.js` | MCP 回调指令生成 |

### 🛠️ 工具

| 功能 | 文件 | 说明 |
|------|------|------|
| 日志工具 | `server/utils/io-logger.js` | 输入输出日志记录 |

### 📜 脚本

| 功能 | 文件 | 说明 |
|------|------|------|
| A2A 运行 | `server/scripts/run-a2a.js` | 命令行启动 A2A 对话 |

## 前端代码

```
web/
├── index.html          # 入口页面
├── style.css           # 样式文件
└── app.js              # 应用逻辑
```

## 关键数据流

```
用户消息
    ↓
server/servers/chat-server.js (WebSocket/SSE)
    ↓
server/a2a/mentions.js (@解析)
    ↓
server/a2a/router.js (路由)
    ↓
server/cli/ai-cli.js (调用 CLI)
    ↓
server/servers/callback-server.js (MCP 回传)
    ↓
server/servers/chat-server.js (SSE 推送给前端)
```

## 快速启动

```bash
# 启动聊天服务器
node server/index.js

# 启动回调服务器
node server/index.js --callback

# 同时启动两个服务器
node server/index.js --both

# 命令行运行 A2A
node server/scripts/run-a2a.js --cats opus,codex "你的问题"
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `CAT_CAFE_PORT` | 聊天服务器端口 | 3200 |
| `CAT_CAFE_CALLBACK_PORT` | 回调服务器端口 | 3201 |
| `MAX_A2A_DEPTH` | A2A 最大链式深度 | 15 |
