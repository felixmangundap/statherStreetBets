import { cn } from '@/lib/utils'
import type { BetStatus } from '@/db/schema'

const STATUS_STYLES: Record<BetStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  won: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  lost: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  void: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  cashed_out: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
}

const STATUS_LABELS: Record<BetStatus, string> = {
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
  void: 'Void',
  cashed_out: 'Cashed Out',
}

interface BetBadgeProps {
  status: BetStatus
  className?: string
}

export default function BetBadge({ status, className }: BetBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
