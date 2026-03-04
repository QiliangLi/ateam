import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
