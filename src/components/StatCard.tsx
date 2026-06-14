import { cn, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  delta?: number
  icon?: React.ReactNode
  className?: string
}

export default function StatCard({ label, value, subValue, delta, icon, className }: StatCardProps) {
  const hasDelta = delta !== undefined && delta !== 0
  const isPositive = (delta ?? 0) > 0
  const isNegative = (delta ?? 0) < 0

  return (
    <div className={cn('bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-xs uppercase tracking-wider font-medium">{label}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>

      <div className="tabular-nums">
        <div className={cn(
          'text-2xl font-bold tracking-tight leading-none',
          isPositive && 'text-emerald-400',
          isNegative && 'text-rose-400',
          !hasDelta && 'text-zinc-100'
        )}>
          {value}
        </div>

        {subValue && (
          <div className="text-zinc-500 text-xs mt-1">{subValue}</div>
        )}
      </div>

      {hasDelta && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          isPositive ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{formatPercent(delta ?? 0)} ROI</span>
        </div>
      )}
    </div>
  )
}
