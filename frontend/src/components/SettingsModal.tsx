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
