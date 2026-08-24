import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-rise">
      <div className="w-14 h-14 rounded-2xl bg-surface-muted border border-line flex items-center justify-center mb-4 rotate-[-6deg]">
        <Icon className="w-6 h-6 text-ink-faint" aria-hidden />
      </div>
      <p className="font-display font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-muted mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
