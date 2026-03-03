import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MentionTagProps {
  agent: {
    id: string
    display: string
  }
  onDelete?: () => void
  className?: string
}

export function MentionTag({ agent, onDelete, className }: MentionTagProps) {
  return (
    <span
      contentEditable={false}
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-blue-700',
        className
      )}
    >
      @{agent.display}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="hover:bg-blue-200 rounded p-0.5 transition-colors"
          aria-label={`Remove ${agent.display}`}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </span>
  )
}
