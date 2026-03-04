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
    disabled,
    className,
}: SliderProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value, 10);
        onChange(newValue);
    };

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <span className="text-sm font-mono text-foreground bg-muted px-2 py-0.5 rounded min-w-[2rem] text-center">
                    {value}
                </span>
            </div>

            {/* 原生 range input */}
            <input
                type="range"
                value={value}
                min={min}
                max={max}
                onChange={handleChange}
                disabled={disabled}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {(minLabel || maxLabel) && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{minLabel || min}</span>
                    <span>{maxLabel || max}</span>
                </div>
            )}
        </div>
    );
}
