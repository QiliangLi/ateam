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
