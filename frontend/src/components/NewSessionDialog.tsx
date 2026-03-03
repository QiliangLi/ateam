import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';

export type ModelEngine = 'gpt-4o' | 'claude-3-opus' | 'gemini-1.5-pro';

export interface SessionConfig {
  modelEngine: ModelEngine;
  streamResponses: boolean;
  systemPrompt?: string;
  temperature?: number;
}

interface NewSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: SessionConfig) => void;
}

const MODEL_ENGINE_LABELS: Record<ModelEngine, string> = {
  'gpt-4o': 'GPT-4o',
  'claude-3-opus': 'Claude 3 Opus',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
};

type TabType = 'quick' | 'advanced';

export function NewSessionDialog({ isOpen, onClose, onCreate }: NewSessionDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [modelEngine, setModelEngine] = useState<ModelEngine>('gpt-4o');
  const [streamResponses, setStreamResponses] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const handleCreate = () => {
    onCreate({
      modelEngine,
      streamResponses,
      systemPrompt: activeTab === 'advanced' && systemPrompt.trim() ? systemPrompt.trim() : undefined,
      temperature: activeTab === 'advanced' ? temperature : undefined,
    });
    // Reset form
    setModelEngine('gpt-4o');
    setStreamResponses(true);
    setSystemPrompt('');
    setTemperature(0.7);
    setActiveTab('quick');
  };

  if (!isOpen) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="新建对话">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('quick')}
            className={`
              px-4 py-2 text-sm font-medium transition-colors relative
              ${activeTab === 'quick'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            快速设置
            {activeTab === 'quick' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`
              px-4 py-2 text-sm font-medium transition-colors relative
              ${activeTab === 'advanced'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            高级设置
            {activeTab === 'advanced' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>

        {/* Quick Setup Tab */}
        {activeTab === 'quick' && (
          <div className="space-y-4 py-2">
            {/* Model Engine Select */}
            <div>
              <label htmlFor="model-engine" className="block text-sm font-medium text-gray-700 mb-1">
                默认模型引擎
              </label>
              <select
                id="model-engine"
                value={modelEngine}
                onChange={(e) => setModelEngine(e.target.value as ModelEngine)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(MODEL_ENGINE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stream Responses Switch */}
            <div className="flex items-center justify-between">
              <label htmlFor="stream-responses" className="text-sm font-medium text-gray-700">
                流式响应
              </label>
              <button
                id="stream-responses"
                onClick={() => setStreamResponses(!streamResponses)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${streamResponses ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${streamResponses ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              启用流式响应时，消息将自动滚动显示最新内容
            </p>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-4 py-2">
            {/* System Prompt */}
            <div>
              <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                系统提示词
              </label>
              <textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="为 AI 助手设定角色和行为准则..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="temperature" className="text-sm font-medium text-gray-700">
                  温度值
                </label>
                <span className="text-sm text-gray-500">{temperature.toFixed(1)}</span>
              </div>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>精确 (0.0)</span>
                <span>平衡 (1.0)</span>
                <span>创意 (2.0)</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </Dialog>
  );
}
