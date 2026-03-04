import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
