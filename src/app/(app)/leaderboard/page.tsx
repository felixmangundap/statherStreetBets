'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { formatCurrency, formatPercent, calcROI, calcWinRate, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface LeaderboardRow {
  userId: number
  displayName: string
  totalStaked: string
  totalReturned: string
  netPnl: string
  betCount: number
  wonCount: number
}

type SortKey = 'netPnl' | 'roi' | 'winRate' | 'betCount'

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-300',
  3: 'text-amber-700',
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
          <Skeleton className="w-6 h-5 bg-zinc-800" />
          <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
          <Skeleton className="h-4 w-28 bg-zinc-800" />
          <div className="ml-auto flex gap-6">
            <Skeleton className="h-4 w-16 bg-zinc-800" />
            <Skeleton className="h-4 w-12 bg-zinc-800 hidden md:block" />
            <Skeleton className="h-4 w-12 bg-zinc-800 hidden md:block" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const [sortKey, setSortKey] = useState<SortKey>('netPnl')
  const [sortDesc, setSortDesc] = useState(true)

  const { data, isLoading } = useSWR<LeaderboardRow[]>(
    '/api/leaderboard',
    fetcher,
    { refreshInterval: 30_000 }
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc((d) => !d)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sorted = useMemo(() => {
    const enriched = (data ?? []).map((row) => ({
      ...row,
      netPnlNum: parseFloat(row.netPnl),
      roi: calcROI(parseFloat(row.totalStaked), parseFloat(row.netPnl)),
      winRate: calcWinRate(row.wonCount, row.betCount),
    }))
    return [...enriched].sort((a, b) => {
      const mult = sortDesc ? -1 : 1
      if (sortKey === 'netPnl') return (a.netPnlNum - b.netPnlNum) * mult
      if (sortKey === 'roi') return (a.roi - b.roi) * mult
      if (sortKey === 'winRate') return (a.winRate - b.winRate) * mult
      if (sortKey === 'betCount') return (a.betCount - b.betCount) * mult
      return 0
    })
  }, [data, sortKey, sortDesc])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-zinc-600" />
    return sortDesc
      ? <ChevronDown className="w-3 h-3 text-emerald-400" />
      : <ChevronUp className="w-3 h-3 text-emerald-400" />
  }

  function SortHeader({ col, label, className }: { col: SortKey; label: string; className?: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className={cn(
          'flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors tabular-nums',
          className
        )}
      >
        {label}
        <SortIcon col={col} />
      </button>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 font-heading">Leaderboard</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Live rankings · updates every 30s</p>
      </div>

      {isLoading ? (
        <LeaderboardSkeleton />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="w-12 h-12 text-zinc-700 mb-4" />
          <h3 className="text-zinc-300 font-semibold mb-2">No data yet</h3>
          <p className="text-zinc-500 text-sm">Start adding bets to see rankings.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 w-10 sticky left-0 bg-zinc-900 z-10">
                  #
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 sticky left-10 bg-zinc-900 z-10 min-w-[140px]">
                  Player
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader col="netPnl" label="Net P&L" className="ml-auto" />
                </th>
                <th className="py-3 px-4 text-right hidden md:table-cell">
                  <SortHeader col="roi" label="ROI %" className="ml-auto" />
                </th>
                <th className="py-3 px-4 text-right hidden md:table-cell">
                  <SortHeader col="winRate" label="Win %" className="ml-auto" />
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader col="betCount" label="Bets" className="ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const rank = idx + 1
                const rankColor = RANK_COLORS[rank] ?? 'text-zinc-500'
                const isPositive = row.netPnlNum > 0
                const initials = row.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

                return (
                  <tr
                    key={row.userId}
                    className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 sticky left-0 bg-zinc-900 z-10">
                      <span className={cn('font-bold text-sm tabular-nums', rankColor)}>
                        {rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 sticky left-10 bg-zinc-900 z-10">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-zinc-100 text-sm whitespace-nowrap">
                          {row.displayName}
                        </span>
                      </div>
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-right font-bold tabular-nums text-sm',
                      isPositive ? 'text-emerald-400' : row.netPnlNum < 0 ? 'text-rose-400' : 'text-zinc-400'
                    )}>
                      {isPositive ? '+' : ''}{formatCurrency(row.netPnlNum, 'USD')}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-300 tabular-nums text-sm hidden md:table-cell">
                      <span className={row.roi > 0 ? 'text-emerald-400' : row.roi < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                        {formatPercent(row.roi)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-300 tabular-nums text-sm hidden md:table-cell">
                      {row.winRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400 tabular-nums text-sm">
                      {row.betCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
