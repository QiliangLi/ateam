import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionTag } from '../MentionTag'

describe('MentionTag', () => {
  it('renders agent name with @ prefix', () => {
    render(<MentionTag agent={{ id: '1', display: 'Alice' }} />)
    expect(screen.getByText('@Alice')).toBeInTheDocument()
  })

  it('has correct styling classes', () => {
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} />
    )
    const tag = container.querySelector('span')
    expect(tag).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('has contentEditable=false attribute', () => {
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} />
    )
    const tag = container.querySelector('span')
    expect(tag).toHaveAttribute('contentEditable', 'false')
  })

  it('shows delete button when onDelete is provided', () => {
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} onDelete={() => {}} />
    )
    const button = container.querySelector('button')
    expect(button).toBeInTheDocument()
  })

  it('does not show delete button when onDelete is not provided', () => {
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} />
    )
    const button = container.querySelector('button')
    expect(button).not.toBeInTheDocument()
  })

  it('calls onDelete when X button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} onDelete={onDelete} />
    )
    const button = container.querySelector('button')
    if (button) {
      await user.click(button)
      expect(onDelete).toHaveBeenCalledTimes(1)
    }
  })

  it('merges custom className with default classes', () => {
    const { container } = render(
      <MentionTag agent={{ id: '1', display: 'Alice' }} className="custom-class" />
    )
    const tag = container.querySelector('span')
    expect(tag).toHaveClass('bg-blue-100', 'text-blue-700', 'custom-class')
  })
})
