# [Frontend] 多 Agent 协作工作流界面功能完善

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善前端6个缺失功能，达到计划中的验收标准

**Architecture:**
- React 18 + TypeScript + Vite + Tailwind CSS
- 组件化开发，每个功能独立组件
- TDD 流程：先写测试，再实现

**Tech Stack:** React, TypeScript, Tailwind CSS, react-mentions, react-markdown, vitest, @testing-library/react

---

## 差距分析（更新后）

| # | 功能 | 当前状态 | 差距 |
|---|------|----------|------|
| 1 | @ 提及 Inline Tag 样式 | Popover/键盘导航 ✅，但选中后是纯文本 | 需渲染为不可分割的 Tag |
| 2 | Meta Status Badge 样式 | 功能 ✅，但样式需规范化 | 统一 Badge 组件样式 |
| 3 | 输入框 auto-grow | ✅ 已实现（maxHeight: 200px） | 无需修改 |
| 4 | 右侧 Session 检查器 | Accordion ✅, Timeline ✅，但数据是 mock | 需动态数据绑定 |
| 5 | 新建对话 Dialog | 骨架 ✅，但功能不完整 | 完善 Tabs/Select/Switch |
| 6 | 虚拟列表优化 | ❌ 未实现 | 添加 react-window |

---

## Task 1: @ 提及 Inline Tag 渲染

**Files:**
- Modify: `frontend/src/components/Composer.tsx`
- Create: `frontend/src/components/ui/MentionTag.tsx`
- Test: `frontend/src/components/__tests__/Composer.test.tsx`

**Step 1: 安装测试依赖**

```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: 创建测试配置**

Create: `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
```

Create: `frontend/src/setupTests.ts`

```typescript
import '@testing-library/jest-dom'
```

**Step 3: 添加测试脚本到 package.json**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "test": "vitest",
  "test:run": "vitest run"
}
```

**Step 4: 写 MentionTag 组件测试**

Create: `frontend/src/components/ui/__tests__/MentionTag.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MentionTag } from '../MentionTag'

describe('MentionTag', () => {
  it('renders agent name with @ prefix', () => {
    render(<MentionTag agent={{ id: 'opus', display: 'opus' }} />)
    expect(screen.getByText('@opus')).toBeInTheDocument()
  })

  it('has correct styling classes', () => {
    const { container } = render(<MentionTag agent={{ id: 'opus', display: 'opus' }} />)
    const tag = container.firstChild as HTMLElement
    expect(tag).toHaveClass('bg-blue-100')
    expect(tag).toHaveClass('text-blue-700')
  })

  it('calls onDelete when X button clicked', async () => {
    const onDelete = vi.fn()
    const { container } = render(<MentionTag agent={{ id: 'opus', display: 'opus' }} onDelete={onDelete} />)
    const deleteBtn = container.querySelector('button')
    deleteBtn?.click()
    expect(onDelete).toHaveBeenCalled()
  })
})
```

**Step 5: 实现 MentionTag 组件**

Create: `frontend/src/components/ui/MentionTag.tsx`

```typescript
import React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MentionTagProps {
  agent: { id: string; display: string }
  onDelete?: () => void
  className?: string
}

export function MentionTag({ agent, onDelete, className }: MentionTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-sm font-medium',
        className
      )}
      contentEditable={false}
    >
      @{agent.display}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="hover:bg-blue-200 rounded-sm p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
```

**Step 6: 运行测试**

```bash
npm run test:run
```

Expected: PASS

**Step 7: Commit**

```bash
git add frontend/src/components/ui/MentionTag.tsx frontend/src/components/ui/__tests__/MentionTag.test.tsx frontend/vitest.config.ts frontend/src/setupTests.ts frontend/package.json
git commit -m "[feat] 添加 MentionTag 组件及测试"
```

---

## Task 2: 集成 MentionTag 到 Composer

**Files:**
- Modify: `frontend/src/components/Composer.tsx`
- Test: `frontend/src/components/__tests__/Composer.test.tsx`

**Step 1: 写 Composer 集成测试**

Create: `frontend/src/components/__tests__/Composer.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Composer } from '../Composer'

describe('Composer', () => {
  const mockAgents = [
    { id: 'opus', display: 'opus' },
    { id: 'codex', display: 'codex' },
  ]

  it('shows popover when @ is typed', async () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText(/@ to mention/)
    fireEvent.change(textarea, { target: { value: '@' } })

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
    })
  })

  it('inserts mention tag when agent selected', async () => {
    const onSend = vi.fn()
    render(<Composer onSend={onSend} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText(/@ to mention/)
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } })
    fireEvent.keyDown(textarea, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
    })
  })
})
```

**Step 2: 修改 Composer 使用 MentionTag**

修改 `Composer.tsx`，在选中 agent 后渲染 MentionTag 组件而非纯文本。

**Step 3: 运行测试**

```bash
npm run test:run
```

**Step 4: Commit**

```bash
git add frontend/src/components/Composer.tsx frontend/src/components/__tests__/Composer.test.tsx
git commit -m "[feat] 集成 MentionTag 到 Composer"
```

---

## Task 3: 统一 Badge 组件样式

**Files:**
- Modify: `frontend/src/components/ui/Badge.tsx`
- Test: `frontend/src/components/ui/__tests__/Badge.test.tsx`

**Step 1: 写 Badge 测试**

Create: `frontend/src/components/ui/__tests__/Badge.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    const { container } = render(<Badge>Test</Badge>)
    expect(container.firstChild).toHaveClass('bg-gray-100')
  })

  it('renders with secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Test</Badge>)
    expect(container.firstChild).toHaveClass('bg-blue-50')
  })

  it('renders with outline variant', () => {
    const { container } = render(<Badge variant="outline">Test</Badge>)
    expect(container.firstChild).toHaveClass('border')
  })

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
```

**Step 2: 完善 Badge 组件**

Modify: `frontend/src/components/ui/Badge.tsx`

确保 Badge 组件有以下变体：
- `default`: 灰色背景
- `secondary`: 蓝色背景
- `outline`: 边框样式
- `success`: 绿色（用于 cache hit）

**Step 3: 运行测试**

```bash
npm run test:run
```

**Step 4: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/__tests__/Badge.test.tsx
git commit -m "[feat] 统一 Badge 组件样式变体"
```

---

## Task 4: 右侧检查器动态数据绑定

**Files:**
- Modify: `frontend/src/components/SidebarRight.tsx`
- Create: `frontend/src/hooks/useSessionStats.ts`
- Test: `frontend/src/hooks/__tests__/useSessionStats.test.ts`

**Step 1: 写 useSessionStats hook 测试**

Create: `frontend/src/hooks/__tests__/useSessionStats.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionStats } from '../useSessionStats'

describe('useSessionStats', () => {
  it('returns initial stats', () => {
    const { result } = renderHook(() => useSessionStats())
    expect(result.current.agentStats).toEqual([])
    expect(result.current.timelineItems).toEqual([])
  })

  it('updates stats when addAgentStat called', () => {
    const { result } = renderHook(() => useSessionStats())

    act(() => {
      result.current.addAgentStat({ id: 'opus', tokens: 1000 })
    })

    expect(result.current.agentStats).toHaveLength(1)
    expect(result.current.agentStats[0].tokens).toBe(1000)
  })

  it('adds timeline item', () => {
    const { result } = renderHook(() => useSessionStats())

    act(() => {
      result.current.addTimelineItem({ title: 'Test', status: 'active' })
    })

    expect(result.current.timelineItems).toHaveLength(1)
  })
})
```

**Step 2: 实现 useSessionStats hook**

Create: `frontend/src/hooks/useSessionStats.ts`

```typescript
import { useState, useCallback } from 'react'

interface AgentStat {
  id: string
  tokens: number
}

interface TimelineItem {
  id: string
  title: string
  description?: string
  status: 'pending' | 'active' | 'completed'
}

export function useSessionStats() {
  const [agentStats, setAgentStats] = useState<AgentStat[]>([])
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])

  const addAgentStat = useCallback((stat: AgentStat) => {
    setAgentStats(prev => {
      const existing = prev.findIndex(s => s.id === stat.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = stat
        return updated
      }
      return [...prev, stat]
    })
  }, [])

  const addTimelineItem = useCallback((item: Omit<TimelineItem, 'id'>) => {
    setTimelineItems(prev => [...prev, { ...item, id: Date.now().toString() }])
  }, [])

  const reset = useCallback(() => {
    setAgentStats([])
    setTimelineItems([])
  }, [])

  return {
    agentStats,
    timelineItems,
    addAgentStat,
    addTimelineItem,
    reset,
  }
}
```

**Step 3: 修改 SidebarRight 使用 hook**

Modify: `frontend/src/components/SidebarRight.tsx`

接收 props 而非使用 mock 数据。

**Step 4: 运行测试**

```bash
npm run test:run
```

**Step 5: Commit**

```bash
git add frontend/src/hooks/useSessionStats.ts frontend/src/hooks/__tests__/useSessionStats.test.ts frontend/src/components/SidebarRight.tsx
git commit -m "[feat] 添加 useSessionStats hook 并集成到 SidebarRight"
```

---

## Task 5: 完善新建对话 Dialog

**Files:**
- Modify: `frontend/src/components/SettingsModal.tsx`
- Create: `frontend/src/components/NewSessionDialog.tsx`
- Test: `frontend/src/components/__tests__/NewSessionDialog.test.tsx`

**Step 1: 写 NewSessionDialog 测试**

Create: `frontend/src/components/__tests__/NewSessionDialog.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NewSessionDialog } from '../NewSessionDialog'

describe('NewSessionDialog', () => {
  it('renders tabs for config modes', () => {
    const onClose = vi.fn()
    const onCreate = vi.fn()
    render(<NewSessionDialog isOpen={true} onClose={onClose} onCreate={onCreate} />)

    expect(screen.getByText('Quick Setup')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('shows model select in quick setup tab', () => {
    const onClose = vi.fn()
    const onCreate = vi.fn()
    render(<NewSessionDialog isOpen={true} onClose={onClose} onCreate={onCreate} />)

    expect(screen.getByLabelText(/Default Model/)).toBeInTheDocument()
  })

  it('shows advanced params in advanced tab', async () => {
    const onClose = vi.fn()
    const onCreate = vi.fn()
    render(<NewSessionDialog isOpen={true} onClose={onClose} onCreate={onCreate} />)

    fireEvent.click(screen.getByText('Advanced'))

    await waitFor(() => {
      expect(screen.getByLabelText(/Temperature/)).toBeInTheDocument()
    })
  })

  it('calls onCreate with config when Create clicked', async () => {
    const onClose = vi.fn()
    const onCreate = vi.fn()
    render(<NewSessionDialog isOpen={true} onClose={onClose} onCreate={onCreate} />)

    fireEvent.click(screen.getByText('Create'))

    expect(onCreate).toHaveBeenCalled()
  })
})
```

**Step 2: 实现 NewSessionDialog 组件**

Create: `frontend/src/components/NewSessionDialog.tsx`

包含：
- Tabs: Quick Setup / Advanced
- Select: 预设模型引擎
- Switch: 流式响应、自动滚动
- Temperature 滑块
- System Prompt 文本框

**Step 3: 运行测试**

```bash
npm run test:run
```

**Step 4: Commit**

```bash
git add frontend/src/components/NewSessionDialog.tsx frontend/src/components/__tests__/NewSessionDialog.test.tsx
git commit -m "[feat] 添加 NewSessionDialog 组件"
```

---

## Task 6: 添加虚拟列表优化

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/VirtualMessageList.tsx`
- Test: `frontend/src/components/__tests__/VirtualMessageList.test.tsx`

**Step 1: 安装 react-window**

```bash
cd frontend && npm install react-window @types/react-window
```

**Step 2: 写 VirtualMessageList 测试**

Create: `frontend/src/components/__tests__/VirtualMessageList.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VirtualMessageList } from '../VirtualMessageList'

describe('VirtualMessageList', () => {
  const mockMessages = Array.from({ length: 100 }, (_, i) => ({
    id: i.toString(),
    role: 'user' as const,
    content: `Message ${i}`,
  }))

  it('renders without crashing', () => {
    render(<VirtualMessageList messages={mockMessages} />)
  })

  it('renders only visible items', () => {
    const { container } = render(<VirtualMessageList messages={mockMessages} />)
    // react-window only renders visible items
    const renderedItems = container.querySelectorAll('[data-index]')
    expect(renderedItems.length).toBeLessThan(100)
  })
})
```

**Step 3: 实现 VirtualMessageList 组件**

Create: `frontend/src/components/VirtualMessageList.tsx`

```typescript
import React, { useRef } from 'react'
import { VariableSizeList as List } from 'react-window'
import { ChatMessage } from './ChatMessage'

interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  agentName?: string
  thoughtProcess?: string
  metrics?: {
    model: string
    ttfb: string
    tokens: string
    cache: string
  }
}

interface VirtualMessageListProps {
  messages: Message[]
  height: number
}

export function VirtualMessageList({ messages, height }: VirtualMessageListProps) {
  const listRef = useRef<List>(null)

  const getItemSize = (index: number) => {
    // Estimate height based on content length
    const msg = messages[index]
    const baseHeight = 80
    const contentLines = Math.ceil(msg.content.length / 80)
    const thoughtHeight = msg.thoughtProcess ? 60 : 0
    return baseHeight + contentLines * 20 + thoughtHeight
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = messages[index]
    return (
      <div style={style}>
        <ChatMessage {...msg} />
      </div>
    )
  }

  return (
    <List
      ref={listRef}
      height={height}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

**Step 4: 修改 App.tsx 使用 VirtualMessageList**

当消息数量 > 50 时使用虚拟列表。

**Step 5: 运行测试**

```bash
npm run test:run
```

**Step 6: Commit**

```bash
git add frontend/src/components/VirtualMessageList.tsx frontend/src/components/__tests__/VirtualMessageList.test.tsx frontend/src/App.tsx frontend/package.json
git commit -m "[feat] 添加虚拟列表优化"
```

---

## 最终验收

```bash
# 1. 运行所有测试
cd frontend && npm run test:run

# 2. 构建检查
npm run build

# 3. 启动开发服务器手动验证
npm run dev
```

---

## 文件变更总结

| 文件 | 操作 |
|------|------|
| `frontend/vitest.config.ts` | Create |
| `frontend/src/setupTests.ts` | Create |
| `frontend/src/components/ui/MentionTag.tsx` | Create |
| `frontend/src/components/ui/__tests__/MentionTag.test.tsx` | Create |
| `frontend/src/components/ui/__tests__/Badge.test.tsx` | Create |
| `frontend/src/components/__tests__/Composer.test.tsx` | Create |
| `frontend/src/components/__tests__/NewSessionDialog.test.tsx` | Create |
| `frontend/src/components/__tests__/VirtualMessageList.test.tsx` | Create |
| `frontend/src/hooks/useSessionStats.ts` | Create |
| `frontend/src/hooks/__tests__/useSessionStats.test.ts` | Create |
| `frontend/src/components/NewSessionDialog.tsx` | Create |
| `frontend/src/components/VirtualMessageList.tsx` | Create |
| `frontend/src/components/Composer.tsx` | Modify |
| `frontend/src/components/ui/Badge.tsx` | Modify |
| `frontend/src/components/SidebarRight.tsx` | Modify |
| `frontend/src/components/SettingsModal.tsx` | Modify |
| `frontend/src/App.tsx` | Modify |
| `frontend/package.json` | Modify |
