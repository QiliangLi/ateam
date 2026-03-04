# Display Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现显示设置功能，允许用户通过滑块调整消息字体、UI字体和界面间距。

**Architecture:** 后端使用 JSON 配置文件存储设置，通过 API 暴露 GET/POST 端点。前端使用 React Context 管理设置状态，通过 CSS 变量动态应用到组件。

**Tech Stack:** Node.js (后端), React + TypeScript + Tailwind CSS (前端)

---

## Task 1: 后端配置文件

**Files:**
- Create: `server/config/display-settings.json`

**Step 1: 创建默认配置文件**

```json
{
  "messageFontSize": 14,
  "uiFontSize": 14,
  "spacing": 4
}
```

**Step 2: 验证文件创建成功**

Run: `cat server/config/display-settings.json`
Expected: 显示上述 JSON 内容

**Step 3: Commit**

```bash
git add server/config/display-settings.json
git commit -m "[display-settings] 添加默认显示设置配置文件"
```

---

## Task 2: 后端 Settings API 路由

**Files:**
- Create: `server/routes/settings.js`
- Modify: `server/servers/chat-server.js:265` (在 Sessions API 结束后添加)

**Step 1: 创建 settings.js 路由模块**

```javascript
/**
 * 显示设置 API 路由
 */
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../config/display-settings.json');

const DEFAULT_SETTINGS = {
  messageFontSize: 14,
  uiFontSize: 14,
  spacing: 4
};

/**
 * 读取显示设置
 */
function getDisplaySettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return { ...DEFAULT_SETTINGS };
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    // 验证并补全字段
    return {
      messageFontSize: clamp(settings.messageFontSize, 12, 20, 14),
      uiFontSize: clamp(settings.uiFontSize, 12, 18, 14),
      spacing: clamp(settings.spacing, 1, 8, 4)
    };
  } catch (err) {
    console.error('读取显示设置失败:', err.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 更新显示设置
 */
function updateDisplaySettings(newSettings) {
  const settings = {
    messageFontSize: clamp(newSettings.messageFontSize, 12, 20, 14),
    uiFontSize: clamp(newSettings.uiFontSize, 12, 18, 14),
    spacing: clamp(newSettings.spacing, 1, 8, 4)
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

/**
 * 将值限制在范围内
 */
function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * 处理 GET /api/settings/display
 */
function handleGetDisplaySettings(req, res, sendJson) {
  const settings = getDisplaySettings();
  sendJson(res, 200, { success: true, data: settings });
}

/**
 * 处理 POST /api/settings/display
 */
async function handleUpdateDisplaySettings(req, res, sendJson, readBody) {
  const raw = await readBody(req);
  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch (e) {
    return sendJson(res, 400, { success: false, error: 'invalid_json' });
  }
  const settings = updateDisplaySettings(payload);
  sendJson(res, 200, { success: true, data: settings });
}

module.exports = {
  handleGetDisplaySettings,
  handleUpdateDisplaySettings,
  getDisplaySettings,
  updateDisplaySettings
};
```

**Step 2: 在 chat-server.js 中注册路由**

在 `// ========== End Sessions API ==========` 注释后添加：

```javascript
  // ========== Display Settings API ==========

  // GET /api/settings/display - 获取显示设置
  if (req.method === 'GET' && pathname === '/api/settings/display') {
    const { handleGetDisplaySettings } = require('../routes/settings');
    return handleGetDisplaySettings(req, res, sendJson);
  }

  // POST /api/settings/display - 更新显示设置
  if (req.method === 'POST' && pathname === '/api/settings/display') {
    const { handleUpdateDisplaySettings } = require('../routes/settings');
    return handleUpdateDisplaySettings(req, res, sendJson, readBody);
  }

  // ========== End Display Settings API ==========
```

**Step 3: 手动测试 API**

```bash
# 启动服务器
node server/index.js &

# 测试 GET
curl http://localhost:3200/api/settings/display
# 期望: {"success":true,"data":{"messageFontSize":14,"uiFontSize":14,"spacing":4}}

# 测试 POST
curl -X POST http://localhost:3200/api/settings/display \
  -H "Content-Type: application/json" \
  -d '{"messageFontSize":16,"uiFontSize":14,"spacing":6}'
# 期望: {"success":true,"data":{"messageFontSize":16,"uiFontSize":14,"spacing":6}}

# 验证持久化
curl http://localhost:3200/api/settings/display
# 期望: 返回更新后的值
```

**Step 4: Commit**

```bash
git add server/routes/settings.js server/servers/chat-server.js
git commit -m "[display-settings] 添加显示设置 API 路由"
```

---

## Task 3: 前端 Slider 组件

**Files:**
- Create: `frontend/src/components/ui/Slider.tsx`
- Create: `frontend/src/components/ui/Slider.test.tsx`

**Step 1: 编写 Slider 组件测试**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with label and value', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} />);
    expect(screen.getByText('字体大小')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('renders min and max labels', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} minLabel="12" maxLabel="20" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    let newValue = 14;
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={(v) => { newValue = v; }} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '16' } });

    expect(newValue).toBe(16);
  });

  it('disables slider when disabled prop is true', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} disabled />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm test -- src/components/ui/Slider.test.tsx`
Expected: FAIL - Slider 组件不存在

**Step 3: 实现 Slider 组件**

```tsx
import React from 'react';
import { cn } from '../../lib/utils';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  onChange,
  minLabel,
  maxLabel,
  disabled = false,
  className
}: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm test -- src/components/ui/Slider.test.tsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/components/ui/Slider.tsx frontend/src/components/ui/Slider.test.tsx
git commit -m "[display-settings] 添加 Slider 滑块组件"
```

---

## Task 4: 前端 DisplaySettingsContext

**Files:**
- Create: `frontend/src/contexts/DisplaySettingsContext.tsx`
- Create: `frontend/src/contexts/DisplaySettingsContext.test.tsx`
- Modify: `frontend/src/index.css` (添加 CSS 变量)

**Step 1: 编写 Context 测试**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DisplaySettingsProvider, useDisplaySettings } from './DisplaySettingsContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function TestComponent() {
  const { settings, updateSettings, loading, error } = useDisplaySettings();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="messageFont">{settings.messageFontSize}</span>
      <span data-testid="uiFont">{settings.uiFontSize}</span>
      <span data-testid="spacing">{settings.spacing}</span>
      <button onClick={() => updateSettings({ messageFontSize: 16 })}>Update</button>
    </div>
  );
}

describe('DisplaySettingsContext', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('provides default settings initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // 永不 resolve
    render(
      <DisplaySettingsProvider>
        <TestComponent />
      </DisplaySettingsProvider>
    );

    expect(screen.getByTestId('messageFont').textContent).toBe('14');
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('loads settings from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { messageFontSize: 16, uiFontSize: 14, spacing: 6 } })
    });

    render(
      <DisplaySettingsProvider>
        <TestComponent />
      </DisplaySettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('messageFont').textContent).toBe('16');
      expect(screen.getByTestId('spacing').textContent).toBe('6');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('updates settings via API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { messageFontSize: 14, uiFontSize: 14, spacing: 4 } })
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { messageFontSize: 16, uiFontSize: 14, spacing: 4 } })
    });

    render(
      <DisplaySettingsProvider>
        <TestComponent />
      </DisplaySettingsProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    screen.getByText('Update').click();

    await waitFor(() => {
      expect(screen.getByTestId('messageFont').textContent).toBe('16');
    });
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm test -- src/contexts/DisplaySettingsContext.test.tsx`
Expected: FAIL - Context 不存在

**Step 3: 实现 DisplaySettingsContext**

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DisplaySettings {
  messageFontSize: number;
  uiFontSize: number;
  spacing: number;
}

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  updateSettings: (newSettings: Partial<DisplaySettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DEFAULT_SETTINGS: DisplaySettings = {
  messageFontSize: 14,
  uiFontSize: 14,
  spacing: 4
};

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

const API_BASE = 'http://localhost:3200';

export function DisplaySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 应用 CSS 变量
  const applyCssVariables = useCallback((s: DisplaySettings) => {
    const root = document.documentElement;
    root.style.setProperty('--font-message', `${s.messageFontSize}px`);
    root.style.setProperty('--font-ui', `${s.uiFontSize}px`);
    // spacing 1-8 映射到 2px-16px
    const spacingPx = s.spacing * 2;
    root.style.setProperty('--spacing-base', `${spacingPx}px`);
  }, []);

  // 加载设置
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/display`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(data.data);
          applyCssVariables(data.data);
        }
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [applyCssVariables]);

  // 更新设置
  const updateSettings = useCallback(async (newSettings: Partial<DisplaySettings>) => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, ...newSettings })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        applyCssVariables(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [settings, applyCssVariables]);

  // 重置设置
  const resetSettings = useCallback(async () => {
    await updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  return (
    <DisplaySettingsContext.Provider value={{ settings, updateSettings, resetSettings, loading, error }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  }
  return context;
}

export { DEFAULT_SETTINGS };
```

**Step 4: 在 index.css 中添加 CSS 变量**

在 `@layer base {` 块中添加：

```css
  :root {
    --font-message: 14px;
    --font-ui: 14px;
    --spacing-base: 8px;
  }
```

**Step 5: 运行测试确认通过**

Run: `cd frontend && npm test -- src/contexts/DisplaySettingsContext.test.tsx`
Expected: PASS - 所有测试通过

**Step 6: Commit**

```bash
git add frontend/src/contexts/DisplaySettingsContext.tsx frontend/src/contexts/DisplaySettingsContext.test.tsx frontend/src/index.css
git commit -m "[display-settings] 添加 DisplaySettingsContext"
```

---

## Task 5: SettingsModal 添加 Display 标签页

**Files:**
- Modify: `frontend/src/components/SettingsModal.tsx`
- Create: `frontend/src/components/SettingsModal.test.tsx`

**Step 1: 编写 SettingsModal Display 标签页测试**

在现有测试文件中添加（如不存在则创建）：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsModal } from './SettingsModal';
import { DisplaySettingsProvider } from '../contexts/DisplaySettingsContext';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SettingsModal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { messageFontSize: 14, uiFontSize: 14, spacing: 4 } })
    });
  });

  it('renders Display tab', () => {
    render(
      <DisplaySettingsProvider>
        <SettingsModal isOpen={true} onClose={() => {}} />
      </DisplaySettingsProvider>
    );

    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('shows display settings when Display tab is clicked', async () => {
    render(
      <DisplaySettingsProvider>
        <SettingsModal isOpen={true} onClose={() => {}} />
      </DisplaySettingsProvider>
    );

    fireEvent.click(screen.getByText('Display'));
    await waitFor(() => {
      expect(screen.getByText('消息字体大小')).toBeInTheDocument();
      expect(screen.getByText('UI 字体大小')).toBeInTheDocument();
      expect(screen.getByText('间距等级')).toBeInTheDocument();
    });
  });

  it('shows reset button in Display tab', async () => {
    render(
      <DisplaySettingsProvider>
        <SettingsModal isOpen={true} onClose={() => {}} />
      </DisplaySettingsProvider>
    );

    fireEvent.click(screen.getByText('Display'));
    await waitFor(() => {
      expect(screen.getByText('恢复默认')).toBeInTheDocument();
    });
  });
});
```

**Step 2: 运行测试确认失败**

Run: `cd frontend && npm test -- src/components/SettingsModal.test.tsx`
Expected: FAIL - Display 标签页不存在

**Step 3: 修改 SettingsModal.tsx 添加 Display 标签页**

完整替换文件内容：

```tsx
import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Slider } from './ui/Slider';
import { useDisplaySettings, DEFAULT_SETTINGS } from '../contexts/DisplaySettingsContext';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState('general');
    const [streamEnabled, setStreamEnabled] = useState(true);
    const { settings, updateSettings, resetSettings } = useDisplaySettings();

    const tabs = [
        { id: 'general', label: 'General presets' },
        { id: 'display', label: 'Display' },
        { id: 'advanced', label: 'Advanced params' }
    ];

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Chat Settings">
            <div className="flex gap-4 border-b mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`pb-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Default Model Engine</label>
                        <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                            <option value="gpt-4o">GPT-4o (Default)</option>
                            <option value="claude-3-opus">Claude 3 Opus</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                        <span className="text-sm font-medium">Stream Responses (Auto-scroll)</span>
                        <button
                            onClick={() => setStreamEnabled(!streamEnabled)}
                            className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${streamEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${streamEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'display' && (
                <div className="space-y-6">
                    <Slider
                        label="消息字体大小"
                        value={settings.messageFontSize}
                        min={12}
                        max={20}
                        minLabel="12"
                        maxLabel="20"
                        onChange={(value) => updateSettings({ messageFontSize: value })}
                    />

                    <Slider
                        label="UI 字体大小"
                        value={settings.uiFontSize}
                        min={12}
                        max={18}
                        minLabel="12"
                        maxLabel="18"
                        onChange={(value) => updateSettings({ uiFontSize: value })}
                    />

                    <Slider
                        label="间距等级"
                        value={settings.spacing}
                        min={1}
                        max={8}
                        minLabel="紧凑 1"
                        maxLabel="8 宽松"
                        onChange={(value) => updateSettings({ spacing: value })}
                    />

                    <div className="pt-4 border-t">
                        <button
                            onClick={resetSettings}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border"
                        >
                            恢复默认
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'advanced' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">System Prompt</label>
                        <textarea className="border rounded-lg px-3 py-2 text-sm h-24 outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="You are a helpful A-team member..."></textarea>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Temperature</label>
                        <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" className="w-full accent-blue-600" />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Precise (0.0)</span>
                            <span>Creative (2.0)</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Save Changes</button>
            </div>
        </Dialog>
    );
}
```

**Step 4: 运行测试确认通过**

Run: `cd frontend && npm test -- src/components/SettingsModal.test.tsx`
Expected: PASS - 所有测试通过

**Step 5: Commit**

```bash
git add frontend/src/components/SettingsModal.tsx frontend/src/components/SettingsModal.test.tsx
git commit -m "[display-settings] SettingsModal 添加 Display 标签页"
```

---

## Task 6: App.tsx 包裹 Provider

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: 在 App.tsx 中导入并包裹 Provider**

在文件顶部添加导入：

```tsx
import { DisplaySettingsProvider } from './contexts/DisplaySettingsContext';
```

修改 return 部分，用 Provider 包裹整个应用：

```tsx
return (
    <DisplaySettingsProvider>
      <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
        {/* ... 其余内容不变 ... */}
      </div>
    </DisplaySettingsProvider>
  );
```

**Step 2: 验证应用启动**

Run: `cd frontend && npm run dev`
Expected: 应用正常启动，无报错

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "[display-settings] App.tsx 包裹 DisplaySettingsProvider"
```

---

## Task 7: ChatMessage 应用设置

**Files:**
- Modify: `frontend/src/components/ChatMessage.tsx`

**Step 1: 修改 ChatMessage 使用 CSS 变量**

修改消息内容区域的样式，应用 CSS 变量：

将原来的：
```tsx
<div className={cn("p-3 rounded-xl", ...)}>
```

改为：
```tsx
<div
    className={cn("rounded-xl", isUser ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border rounded-tl-sm shadow-sm")}
    style={{
        padding: `calc(var(--spacing-base) * 0.75)`,
        fontSize: `var(--font-message)`
    }}
>
```

同时修改 agent 头像和用户头像的字体大小：
```tsx
// agent 头像区域
<div className="w-7 h-7 rounded-lg bg-gray-100 border flex items-center justify-center shrink-0" style={{ fontSize: 'var(--font-ui)' }}>

// 用户头像区域
<div className="w-8 h-8 rounded-lg bg-blue-100 border-blue-200 border flex items-center justify-center shrink-0" style={{ fontSize: 'var(--font-ui)' }}>
```

**Step 2: 验证视觉效果**

Run: `cd frontend && npm run dev`
手动测试：打开设置 → Display → 调整滑块 → 验证消息区域字体和边距变化

**Step 3: Commit**

```bash
git add frontend/src/components/ChatMessage.tsx
git commit -m "[display-settings] ChatMessage 应用显示设置"
```

---

## Task 8: E2E 测试

**Files:**
- Create: `tests/e2e/display-settings.spec.js`

**Step 1: 编写 E2E 测试**

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Display Settings', () => {
  test.beforeEach(async ({ page }) => {
    // 启动后端服务（假设已运行）
    await page.goto('http://localhost:5173');
  });

  test('should open settings modal', async ({ page }) => {
    // 点击设置按钮
    await page.click('[title="Settings & Presets"]');
    await expect(page.locator('text=Chat Settings')).toBeVisible();
  });

  test('should switch to Display tab', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');
    await expect(page.locator('text=消息字体大小')).toBeVisible();
  });

  test('should adjust font size and see changes', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 获取初始值
    const initialValue = await page.locator('text=消息字体大小').locator('..').locator('.font-mono').textContent();

    // 调整滑块
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('18');

    // 验证值变化
    const newValue = await page.locator('text=消息字体大小').locator('..').locator('.font-mono').textContent();
    expect(newValue).toBe('18');
    expect(newValue).not.toBe(initialValue);
  });

  test('should reset to defaults', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 先修改设置
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('18');

    // 点击恢复默认
    await page.click('text=恢复默认');

    // 验证恢复到默认值
    const value = await page.locator('text=消息字体大小').locator('..').locator('.font-mono').textContent();
    expect(value).toBe('14');
  });

  test('should persist settings after reload', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 修改设置
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('16');

    // 等待保存
    await page.waitForTimeout(500);

    // 刷新页面
    await page.reload();

    // 再次打开设置
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 验证设置保持
    const value = await page.locator('text=消息字体大小').locator('..').locator('.font-mono').textContent();
    expect(value).toBe('16');
  });
});
```

**Step 2: 运行 E2E 测试**

```bash
# 确保后端运行
node server/index.js &

# 确保前端运行
cd frontend && npm run dev &

# 运行测试
npx playwright test tests/e2e/display-settings.spec.js
```

Expected: PASS - 所有测试通过

**Step 3: Commit**

```bash
git add tests/e2e/display-settings.spec.js
git commit -m "[display-settings] 添加 E2E 测试"
```

---

## 实现顺序总结

1. ✅ Task 1: 后端配置文件
2. ✅ Task 2: 后端 Settings API 路由
3. ✅ Task 3: 前端 Slider 组件
4. ✅ Task 4: 前端 DisplaySettingsContext
5. ✅ Task 5: SettingsModal 添加 Display 标签页
6. ✅ Task 6: App.tsx 包裹 Provider
7. ✅ Task 7: ChatMessage 应用设置
8. ✅ Task 8: E2E 测试

---

**Plan complete and saved to `docs/plans/2026-03-03-display-settings-impl.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
