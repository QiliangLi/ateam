# 显示设置功能设计

> 日期：2026-03-03
> 状态：已确认

## 概述

开发一个设置功能，允许用户调整字体大小和界面间距。采用分层控制（消息字体、UI字体、间距三个独立设置），使用滑块交互，配置存储在后端 JSON 文件中。

## 数据模型

**配置文件**：`server/config/display-settings.json`

```json
{
  "messageFontSize": 14,
  "uiFontSize": 14,
  "spacing": 4
}
```

**字段说明**：
- `messageFontSize`：聊天消息字体大小，范围 12-20
- `uiFontSize`：UI 元素（侧边栏、按钮等）字体大小，范围 12-18
- `spacing`：间距等级，范围 1-8（1=紧凑，8=宽松）

**默认值**：14/14/4

## 后端 API

**端点设计**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings/display` | 获取当前显示设置 |
| POST | `/api/settings/display` | 更新显示设置 |

**GET 响应**：
```json
{
  "success": true,
  "data": {
    "messageFontSize": 14,
    "uiFontSize": 14,
    "spacing": 4
  }
}
```

**POST 请求体**：
```json
{
  "messageFontSize": 16,
  "uiFontSize": 14,
  "spacing": 6
}
```

**文件位置**：`server/routes/settings.js`

## 前端组件

**SettingsModal 改动**：

新增 "Display" 标签页，与现有 General/Advanced 并列。

**Display 标签页布局**：

```
┌─────────────────────────────────────┐
│  Display                             │
├─────────────────────────────────────┤
│                                      │
│  消息字体大小          [====●===] 14 │
│  12                        20        │
│                                      │
│  UI 字体大小           [===●====] 14 │
│  12                        18        │
│                                      │
│  间距等级               [==●====] 4  │
│  紧凑 1       8 宽松                 │
│                                      │
│  [ 恢复默认 ]                        │
│                                      │
└─────────────────────────────────────┘
```

**新增文件**：
- `src/components/ui/Slider.tsx` - 滑块组件
- `src/hooks/useDisplaySettings.ts` - 设置状态管理 hook
- `src/contexts/DisplaySettingsContext.tsx` - 设置 Context

**修改文件**：
- `src/components/SettingsModal.tsx` - 添加 Display 标签页
- `src/components/ChatMessage.tsx` - 应用字体和间距设置
- `src/App.tsx` - 包裹 DisplaySettingsProvider

## 设置应用机制

**使用 React Context + CSS 变量**：

**1. DisplaySettingsContext**：
- 提供 `settings` 状态和 `updateSettings` 方法
- 启动时从 API 加载设置
- 更新时同步调用 API 保存

**2. CSS 变量应用**：
```css
:root {
  --font-message: 14px;
  --font-ui: 14px;
  --spacing-base: 8px;
}
```

**3. 组件使用示例**：

```tsx
<div
  className="rounded-xl"
  style={{
    padding: `calc(var(--spacing-base) * 0.75)`,
    fontSize: `var(--font-message)`
  }}
>
```

**4. 间距映射表**：

| spacing 值 | --spacing-base | 消息边距 | 组件间隙 |
|------------|----------------|----------|----------|
| 1 | 2px | 1.5px | 2px |
| 4 | 8px | 6px | 8px |
| 8 | 16px | 12px | 16px |

## 错误处理

1. **API 请求失败** - 显示 toast 提示，保持当前设置不变
2. **配置文件不存在** - 后端自动创建默认配置
3. **配置文件格式错误** - 后端返回默认值并记录日志
4. **滑块值超出范围** - 前端 clamp 到有效范围内

## 测试覆盖

**后端单元测试**：
- GET/POST API 正常流程
- 配置文件不存在时的处理
- 无效值的处理

**前端单元测试**：
- Slider 组件交互
- useDisplaySettings hook 状态管理
- SettingsModal 表单提交

**E2E 测试**：
- 打开设置 → 调整滑块 → 验证界面变化
- 刷新页面 → 验证设置保持

## 实现顺序

1. 后端：配置文件 + API 路由
2. 前端：Slider 组件
3. 前端：DisplaySettingsContext + hook
4. 前端：SettingsModal Display 标签页
5. 前端：ChatMessage 应用设置
6. 测试：后端 + 前端 + E2E
