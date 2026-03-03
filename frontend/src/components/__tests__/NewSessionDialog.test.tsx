import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewSessionDialog, type SessionConfig } from '../NewSessionDialog'

describe('NewSessionDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn(),
  }

  it('renders tabs for config modes', () => {
    render(<NewSessionDialog {...defaultProps} />)

    expect(screen.getByText('快速设置')).toBeInTheDocument()
    expect(screen.getByText('高级设置')).toBeInTheDocument()
  })

  it('shows model select in quick setup tab', () => {
    render(<NewSessionDialog {...defaultProps} />)

    expect(screen.getByText('默认模型引擎')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument()
    expect(screen.getByText('Gemini 1.5 Pro')).toBeInTheDocument()
  })

  it('shows stream responses switch in quick setup tab', () => {
    render(<NewSessionDialog {...defaultProps} />)

    expect(screen.getByText('流式响应')).toBeInTheDocument()
    expect(screen.getByText(/启用流式响应时/)).toBeInTheDocument()
  })

  it('toggles stream responses switch', async () => {
    const user = userEvent.setup()
    render(<NewSessionDialog {...defaultProps} />)

    // Find the switch button (it's the button element with id="stream-responses")
    const switchButton = document.getElementById('stream-responses') as HTMLElement
    expect(switchButton).toHaveClass('bg-blue-600')

    await user.click(switchButton)
    expect(switchButton).toHaveClass('bg-gray-200')
  })

  it('shows advanced params in advanced tab', async () => {
    const user = userEvent.setup()
    render(<NewSessionDialog {...defaultProps} />)

    await user.click(screen.getByText('高级设置'))

    expect(screen.getByText('系统提示词')).toBeInTheDocument()
    expect(screen.getByText('温度值')).toBeInTheDocument()
  })

  it('calls onCreate with quick setup config when Create clicked', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewSessionDialog {...defaultProps} onCreate={onCreate} />)

    await user.click(screen.getByText('创建'))

    expect(onCreate).toHaveBeenCalledTimes(1)
    const config = onCreate.mock.calls[0][0] as SessionConfig
    expect(config.modelEngine).toBe('gpt-4o')
    expect(config.streamResponses).toBe(true)
    expect(config.systemPrompt).toBeUndefined()
    expect(config.temperature).toBeUndefined()
  })

  it('calls onCreate with advanced config when Create clicked', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewSessionDialog {...defaultProps} onCreate={onCreate} />)

    // Switch to advanced tab
    await user.click(screen.getByText('高级设置'))

    // Fill in system prompt
    const systemPromptTextarea = screen.getByPlaceholderText('为 AI 助手设定角色和行为准则...')
    await user.clear(systemPromptTextarea)
    await user.type(systemPromptTextarea, 'You are a helpful assistant')

    // Create
    await user.click(screen.getByText('创建'))

    expect(onCreate).toHaveBeenCalledTimes(1)
    const config = onCreate.mock.calls[0][0] as SessionConfig
    expect(config.systemPrompt).toBe('You are a helpful assistant')
    expect(config.temperature).toBe(0.7)
  })

  it('allows changing model engine selection', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewSessionDialog {...defaultProps} onCreate={onCreate} />)

    const select = screen.getByLabelText('默认模型引擎')
    await user.selectOptions(select, 'claude-3-opus')

    await user.click(screen.getByText('创建'))

    const config = onCreate.mock.calls[0][0] as SessionConfig
    expect(config.modelEngine).toBe('claude-3-opus')
  })

  it('allows changing temperature value', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<NewSessionDialog {...defaultProps} onCreate={onCreate} />)

    await user.click(screen.getByText('高级设置'))

    const slider = screen.getByLabelText('温度值')
    expect(slider).toHaveValue('0.7')
  })

  it('calls onClose when Cancel clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NewSessionDialog {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('取消'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('resets form after create', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    const { rerender } = render(<NewSessionDialog {...defaultProps} onCreate={onCreate} />)

    // Change some values
    await user.selectOptions(screen.getByLabelText('默认模型引擎'), 'claude-3-opus')
    await user.click(screen.getByText('高级设置'))
    await user.type(
      screen.getByPlaceholderText('为 AI 助手设定角色和行为准则...'),
      'Custom prompt'
    )

    // Create
    await user.click(screen.getByText('创建'))

    // Re-mount to check reset (simulating dialog reopening)
    rerender(<NewSessionDialog {...defaultProps} isOpen={false} onCreate={onCreate} />)
    rerender(<NewSessionDialog {...defaultProps} isOpen={true} onCreate={onCreate} />)

    // Should be back to quick tab with default values
    expect(screen.getByText('快速设置')).toBeInTheDocument()
    const select = screen.getByLabelText('默认模型引擎')
    expect(select).toHaveValue('gpt-4o')
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(<NewSessionDialog {...defaultProps} isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })
})
