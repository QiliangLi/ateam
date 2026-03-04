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
            <div className="flex gap-4 border-b border-border/50 mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`pb-2 text-sm font-medium transition-colors cursor-pointer ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-foreground">Default Model Engine</label>
                        <select className="border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary glass">
                            <option value="gpt-4o">GPT-4o (Default)</option>
                            <option value="claude-3-opus">Claude 3 Opus</option>
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-border/50 rounded-lg glass-subtle">
                        <span className="text-sm font-medium text-foreground">Stream Responses (Auto-scroll)</span>
                        <button
                            onClick={() => setStreamEnabled(!streamEnabled)}
                            className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors cursor-pointer ${streamEnabled ? 'bg-primary' : 'bg-muted'}`}
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
                        min={10}
                        max={20}
                        minLabel="10"
                        maxLabel="20"
                        onChange={(value) => updateSettings({ messageFontSize: value })}
                    />

                    <Slider
                        label="UI 字体大小"
                        value={settings.uiFontSize}
                        min={10}
                        max={18}
                        minLabel="10"
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

                    <div className="pt-4 border-t border-border/50">
                        <button
                            onClick={resetSettings}
                            className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg border border-border/50 cursor-pointer"
                        >
                            恢复默认
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'advanced' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-foreground">System Prompt</label>
                        <textarea className="border border-border/50 rounded-lg px-3 py-2 text-sm h-24 outline-none focus:ring-2 focus:ring-primary/20 glass" placeholder="You are a helpful A-team member..."></textarea>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-foreground">Temperature</label>
                        <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" className="w-full accent-primary" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Precise (0.0)</span>
                            <span>Creative (2.0)</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/50">
                <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg cursor-pointer">Cancel</button>
                <button onClick={onClose} className="px-4 py-2 text-sm bg-primary text-white hover:bg-primary-hover rounded-lg cursor-pointer">Save Changes</button>
            </div>
        </Dialog>
    );
}
