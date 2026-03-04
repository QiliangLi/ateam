import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with label and value', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} />);
    expect(screen.getByText('字体大小')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('renders min and max labels when provided', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} minLabel="12" maxLabel="20" />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    let newValue = 14;
    const handleChange = vi.fn((v) => { newValue = v; };

    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={handleChange} />);

    // 模拟点击轨道
    const track = screen.getByRole('generic').closest('div');
    expect(track).toBeInTheDocument();

    // 模拟点击轨道的填充区域
    fireEvent.click(track);

    expect(handleChange).toHaveBeenCalledTimes();
    expect(newValue).toBe(16);
  });

  it('disables slider when disabled prop is true', () => {
    render(<Slider label="字体大小" value={14} min={12} max={20} onChange={() => {}} disabled />);
    // 滑块把手应该有 opacity-50 和 not-interactive类
    const track = screen.getByRole('generic').closest('div');
    expect(track).toHaveClass('cursor-not-allowed');
  });
});
