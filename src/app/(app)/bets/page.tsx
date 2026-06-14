'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useUser } from '@clerk/nextjs'
import { Ticket, Trash2, Plus, CheckCircle } from 'lucide-react'
import BetBadge from '@/components/BetBadge'
import BetModal from '@/components/BetModal'
import BetOutcomeModal from '@/components/BetOutcomeModal'
import { fetcher } from '@/lib/fetcher'
import { formatCurrency, formatOdds, cn, fmtEst } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import type { BetStatus, BetType } from '@/db/schema'
import Link from 'next/link'

const BET_TYPE_LABELS: Record<BetType, string> = {
  match_winner: 'Match Winner',
  over_under: 'Over/Under',
  btts: 'BTTS',
  accumulator: 'Accumulator',
  custom: 'Custom',
}

interface BetRow {
  bet: {
    id: number
    description: string
    selection: string
    betType: BetType
    status: BetStatus
    odds: string
    stake: string
    payout: string | null
    currency: string
    notes: string | null
    createdAt: string
    fixtureId: number | null
    userId: number
    placedByUserId: number | null
  }
  attributedUser: { id: number; displayName: string }
}

function BetSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40 bg-zinc-800" />
            <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
          </div>
          <Skeleton className="h-3 w-56 bg-zinc-800" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-16 bg-zinc-800" />
            <Skeleton className="h-3 w-16 bg-zinc-800" />
            <Skeleton className="h-3 w-16 bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface MemberData {
  id: number
  displayName: string
}

export default function BetsPage() {
  const [statusFilter, setStatusFilter] = useState<BetStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<BetType | 'all'>('all')
  const [betModalOpen, setBetModalOpen] = useState(false)
  const [outcomeModalBet, setOutcomeModalBet] = useState<BetRow['bet'] | null>(null)

  const { data, isLoading } = useSWR<BetRow[]>('/api/bets', fetcher)
  const { data: members } = useSWR<MemberData[]>('/api/league/members', fetcher)
  const { data: currentUser } = useSWR<MemberData>('/api/user/me', fetcher)

  async function deleteBet(id: number) {
    if (!confirm('Delete this bet?')) return
    await fetch(`/api/bets/${id}`, { method: 'DELETE' })
    globalMutate('/api/bets')
  }

  const filtered = (data ?? []).filter((row) => {
    if (statusFilter !== 'all' && row.bet.status !== statusFilter) return false
    if (typeFilter !== 'all' && row.bet.betType !== typeFilter) return false
    return true
  })

  const pnl = (row: BetRow['bet']) => {
    if (row.status === 'won') return parseFloat(row.payout ?? '0') - parseFloat(row.stake)
    if (row.status === 'lost') return -parseFloat(row.stake)
    return null
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 font-heading">Bets</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {data ? `${data.length} total` : 'Loading…'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setBetModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Bet
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BetStatus | 'all')}>
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700 text-zinc-300 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="void">Void</SelectItem>
              <SelectItem value="cashed_out">Cashed Out</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BetType | 'all')}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-zinc-300 h-8 text-sm">
              <SelectValue placeholder="Bet Type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="match_winner">Match Winner</SelectItem>
              <SelectItem value="over_under">Over/Under</SelectItem>
              <SelectItem value="btts">BTTS</SelectItem>
              <SelectItem value="accumulator">Accumulator</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bet List */}
        {isLoading ? (
          <BetSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ticket className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-zinc-300 font-semibold mb-2">No bets yet</h3>
            <p className="text-zinc-500 text-sm">
              Add your first bet from the{' '}
              <Link href="/schedule" className="text-emerald-400 hover:text-emerald-300">
                Schedule
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ bet, attributedUser }) => {
              const profit = pnl(bet)
              const isProxy = bet.placedByUserId !== null && bet.placedByUserId !== bet.userId

              return (
                <div
                  key={bet.id}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3 hover:border-zinc-700 transition-colors"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-100 text-sm font-semibold truncate">
                          {bet.description}
                        </span>
                        <span className="text-zinc-500 text-xs shrink-0">
                          {BET_TYPE_LABELS[bet.betType]}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5 truncate">{bet.selection}</p>
                    </div>
                    <BetBadge status={bet.status} />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs tabular-nums flex-wrap">
                    <span className="text-zinc-500">
                      Odds <span className="text-zinc-300 font-medium">{formatOdds(parseFloat(bet.odds))}</span>
                    </span>
                    <span className="text-zinc-500">
                      Stake <span className="text-zinc-300 font-medium">{formatCurrency(parseFloat(bet.stake), bet.currency)}</span>
                    </span>
                    {profit !== null && (
                      <span className={cn(
                        'font-semibold',
                        profit > 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}>
                        {profit > 0 ? '+' : ''}{formatCurrency(profit, bet.currency)}
                      </span>
                    )}
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-zinc-600 text-xs">
                        {fmtEst(bet.createdAt, 'MMM d, HH:mm')}
                      </span>
                      {isProxy && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Logged by {attributedUser.displayName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {bet.status === 'pending' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setOutcomeModalBet(bet)}
                              className="p-1.5 text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Set outcome</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => deleteBet(bet.id)}
                            className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Delete bet</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {betModalOpen && (
        <BetModal
          fixture={null}
          members={members ?? []}
          currentUserId={currentUser?.id ?? 0}
          open={betModalOpen}
          onClose={() => {
            setBetModalOpen(false)
            globalMutate('/api/bets')
          }}
        />
      )}

      {outcomeModalBet && (
        <BetOutcomeModal
          bet={outcomeModalBet}
          open={!!outcomeModalBet}
          onClose={() => setOutcomeModalBet(null)}
        />
      )}
    </TooltipProvider>
  )
}
