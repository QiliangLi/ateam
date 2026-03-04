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
