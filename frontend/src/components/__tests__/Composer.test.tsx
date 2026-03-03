import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Composer } from '../Composer'

describe('Composer', () => {
  const mockAgents = [
    { id: 'opus', display: 'opus' },
    { id: 'codex', display: 'codex' },
    { id: 'gemini', display: 'gemini' },
  ]

  it('renders textarea with placeholder', () => {
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)
    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    expect(textarea).toBeInTheDocument()
  })

  it('shows popover when @ is typed', async () => {
    const user = userEvent.setup()
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, '@')

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
    })
  })

  it('filters agents based on query after @', async () => {
    const user = userEvent.setup()
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, '@op')

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
      expect(screen.queryByText('@codex')).not.toBeInTheDocument()
    })
  })

  it('inserts mention tag when agent is selected from popover', async () => {
    const user = userEvent.setup()
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, '@op')

    await waitFor(() => {
      const opusOption = screen.getByText('@opus')
      expect(opusOption).toBeInTheDocument()
    })

    const opusOption = screen.getByText('@opus').closest('button')
    if (opusOption) {
      await user.click(opusOption)
    }

    await waitFor(() => {
      // MentionTag should be rendered with blue styling
      const mentionTag = screen.getByText('@opus')
      expect(mentionTag).toBeInTheDocument()
      expect(mentionTag.closest('.bg-blue-100')).toBeInTheDocument()
    })
  })

  it('calls onSend with message when send button is clicked', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const { container } = render(<Composer onSend={onSend} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, 'Hello world')

    const sendButton = container.querySelector('.bg-blue-600')
    if (sendButton) {
      await user.click(sendButton)
    }

    expect(onSend).toHaveBeenCalledWith('Hello world')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const { container } = render(<Composer onSend={onSend} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...') as HTMLTextAreaElement
    await user.type(textarea, 'Hello world')

    const sendButton = container.querySelector('.bg-blue-600')
    if (sendButton) {
      await user.click(sendButton)
    }

    expect(textarea.value).toBe('')
  })

  it('hides popover when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, '@')

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('@opus')).not.toBeInTheDocument()
    })
  })

  it('navigates popover with arrow keys', async () => {
    const user = userEvent.setup()
    render(<Composer onSend={vi.fn()} agents={mockAgents} />)

    const textarea = screen.getByPlaceholderText('Type a message or @ to mention an agent...')
    await user.type(textarea, '@')

    await waitFor(() => {
      expect(screen.getByText('@opus')).toBeInTheDocument()
    })

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')

    await waitFor(() => {
      // First item should not be selected anymore
      const firstOption = screen.getByText('@opus').closest('button')
      expect(firstOption).not.toHaveClass('bg-blue-50')
    })
  })
})
