import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  describe('variant styles', () => {
    it('renders default variant with gray colors', () => {
      const { container } = render(<Badge>Default</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
    })

    it('renders secondary variant with blue colors', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('bg-blue-50', 'text-blue-700')
    })

    it('renders outline variant with border', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('border-gray-300', 'text-gray-700', 'bg-transparent')
    })

    it('renders success variant with green colors for cache hit', () => {
      const { container } = render(<Badge variant="success">Cached</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('bg-emerald-50', 'text-emerald-700', 'border-emerald-200')
    })
  })

  describe('custom className', () => {
    it('merges custom className with default classes', () => {
      const { container } = render(
        <Badge className="custom-class">With Custom Class</Badge>
      )
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'custom-class')
    })

    it('merges custom className with variant classes', () => {
      const { container } = render(
        <Badge variant="success" className="custom-class">
          Cached
        </Badge>
      )
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('bg-emerald-50', 'text-emerald-700', 'custom-class')
    })
  })

  describe('rendering', () => {
    it('renders children text', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('renders complex children', () => {
      render(
        <Badge>
          <span>Icon</span> Text
        </Badge>
      )
      expect(screen.getByText('Icon')).toBeInTheDocument()
      expect(screen.getByText('Text')).toBeInTheDocument()
    })

    it('passes through HTML props', () => {
      const { container } = render(
        <Badge data-testid="test-badge" title="Badge Title">
          Test
        </Badge>
      )
      const badge = container.querySelector('div')
      expect(badge).toHaveAttribute('data-testid', 'test-badge')
      expect(badge).toHaveAttribute('title', 'Badge Title')
    })
  })

  describe('base styles', () => {
    it('has inline-flex layout', () => {
      const { container } = render(<Badge>Test</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('inline-flex', 'items-center')
    })

    it('has rounded-full and padding', () => {
      const { container } = render(<Badge>Test</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('rounded-full', 'px-2.5', 'py-0.5')
    })

    it('has text-xs and font-semibold', () => {
      const { container } = render(<Badge>Test</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('text-xs', 'font-semibold')
    })

    it('has transition-colors', () => {
      const { container } = render(<Badge>Test</Badge>)
      const badge = container.querySelector('div')
      expect(badge).toHaveClass('transition-colors')
    })
  })
})
