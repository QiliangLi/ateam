import React, { useRef, useCallback } from 'react';
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
  const sliderRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // 计算滑块位置百分比
  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback((newValue: number) => {
    const clamped = Math.max(min, Math.min(max, newValue));
    onChange(clamped);
  }, [min, max, onChange]);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercentage = clickX / rect.width;
    const newValue = Math.round(min + newPercentage * (max - min));
    handleChange(newValue);
  }, [disabled, min, max, handleChange]);

  const handleDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const startX = e.clientX;
    const startValue = value;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaPercentage = deltaX / rect.width;
      const newPercentage = (startValue - min) / (max - min) + deltaPercentage;
      const newValue = Math.round(min + Math.max(0, Math.min(1, newPercentage)) * (max - min));
      handleChange(newValue);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [disabled, value, min, max, handleChange]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded min-w-[2rem] text-center">{value}</span>
      </div>

      {/* 自定义滑块轨道 */}
      <div
        ref={trackRef}
        className={cn(
          "relative h-2 w-full rounded-full cursor-pointer select-none",
          disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
        onClick={handleTrackClick}
        onMouseDown={handleDrag}
      >
        {/* 轨道背景 */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />

        {/* 已填充部分 */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />

        {/* 滑块把手 */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-gray-200 transition-all duration-75",
            disabled ? "cursor-not-allowed" : "cursor-grab hover:scale-110 hover:shadow-lg"
          )}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{minLabel || min}</span>
          <span>{maxLabel || max}</span>
        </div>
      )}
    </div>
  );
}
