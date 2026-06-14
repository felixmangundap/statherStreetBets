'use client'

import { useState, useMemo } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { fetcher } from '@/lib/fetcher'
import { formatCurrency, formatOdds, cn, fmtEst } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import BetBadge from '@/components/BetBadge'
import BetModal from '@/components/BetModal'
import BetOutcomeModal from '@/components/BetOutcomeModal'
import FixtureCard from '@/components/FixtureCard'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Plus, CheckCircle, Gamepad2, TrendingUp, TrendingDown, Ticket, ChevronDown, ChevronUp } from 'lucide-react'
import type { Fixture, BetStatus } from '@/db/schema'

interface MemberData {
  id: number
  displayName: string
}

interface GameClientProps {
  currentUserId: number
  currency: string
  members: MemberData[]
}

interface BetRow {
  id: number
  userId: number
  placedByUserId: number | null
  fixtureId: number | null
  betType: string
  description: string
  selection: string
  odds: string
  stake: string
  currency: string
  status: BetStatus
  payout: string | null
  notes: string | null
  createdAt: string
}

interface BetWithUser {
  bet: BetRow
  attributedUser: { id: number; displayName: string }
}

interface Reaction {
  id: number
  betId: number
  userId: number
  emoji: string
}

const LIVE_STATUSES = ['LIVE', '1H', '2H', 'HT', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']
const QUICK_EMOJIS = ['🔥', '💀', '🤑', '😬', '👀', '🙏']

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function GameClient({ currentUserId, currency, members }: GameClientProps) {
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null)
  const [betModalOpen, setBetModalOpen] = useState(false)
  const [outcomeModalBet, setOutcomeModalBet] = useState<BetRow | null>(null)
  const [reactingBetId, setReactingBetId] = useState<number | null>(null)
  const [showPastGames, setShowPastGames] = useState(false)

  const { data: fixtures } = useSWR<Fixture[]>('/api/fixtures', fetcher, { refreshInterval: 30_000 })
  const { data: allBets } = useSWR<BetWithUser[]>('/api/bets', fetcher, { refreshInterval: 30_000 })

  // Active fixtures: live first, then all upcoming NS games
  const gameFixtures = useMemo(() => {
    if (!fixtures) return []
    const live = fixtures.filter((f) => LIVE_STATUSES.includes(f.status))
    const upcoming = fixtures.filter((f) => f.status === 'NS')
    return [...live, ...upcoming]
  }, [fixtures])

  // Past fixtures for the results section
  const pastFixtures = useMemo(() => {
    if (!fixtures) return []
    return fixtures
      .filter((f) => FINISHED_STATUSES.includes(f.status))
      .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
  }, [fixtures])

  const selectedFixture = useMemo(() => {
    if (!fixtures) return null
    const allFixtures = [...gameFixtures, ...pastFixtures]
    if (!allFixtures.length) return null
    const id = selectedFixtureId ?? gameFixtures[0]?.id ?? pastFixtures[0]?.id
    return allFixtures.find((f) => f.id === id) ?? null
  }, [fixtures, gameFixtures, pastFixtures, selectedFixtureId])

  const fixtureBets = useMemo(() => {
    if (!allBets || !selectedFixture) return []
    return allBets.filter(({ bet }) => bet.fixtureId === selectedFixture.id)
  }, [allBets, selectedFixture])

  const gameStats = useMemo(() => {
    const totalBets = fixtureBets.length
    const totalStaked = fixtureBets.reduce((s, { bet }) => s + parseFloat(bet.stake), 0)
    const wonCount = fixtureBets.filter(({ bet }) => bet.status === 'won').length
    const lostCount = fixtureBets.filter(({ bet }) => bet.status === 'lost').length

    const playerPnl: Record<string, { name: string; pnl: number }> = {}
    for (const { bet, attributedUser } of fixtureBets) {
      const key = String(attributedUser.id)
      if (!playerPnl[key]) playerPnl[key] = { name: attributedUser.displayName, pnl: 0 }
      if (bet.status === 'won') playerPnl[key].pnl += parseFloat(bet.payout ?? '0') - parseFloat(bet.stake)
      else if (bet.status === 'lost') playerPnl[key].pnl -= parseFloat(bet.stake)
    }

    const sorted = Object.values(playerPnl).sort((a, b) => b.pnl - a.pnl)
    return { totalBets, totalStaked, wonCount, lostCount, topWinner: sorted[0] ?? null, topLoser: sorted[sorted.length - 1] ?? null }
  }, [fixtureBets])

  const { data: reactions, mutate: mutateReactions } = useSWR<Reaction[]>(
    selectedFixture ? `/api/game/${selectedFixture.id}/reactions` : null,
    fetcher,
    { refreshInterval: 15_000 }
  )

  const reactionsByBet = useMemo(() => {
    const map: Record<number, Record<string, number[]>> = {}
    for (const r of reactions ?? []) {
      if (!map[r.betId]) map[r.betId] = {}
      if (!map[r.betId][r.emoji]) map[r.betId][r.emoji] = []
      map[r.betId][r.emoji].push(r.userId)
    }
    return map
  }, [reactions])

  async function toggleReaction(betId: number, emoji: string) {
    await fetch(`/api/bets/${betId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    mutateReactions()
  }

  async function deleteBet(id: number) {
    if (!confirm('Delete this bet?')) return
    await fetch(`/api/bets/${id}`, { method: 'DELETE' })
    globalMutate('/api/bets')
    globalMutate('/api/dashboard')
    globalMutate('/api/leaderboard')
  }

  const pnl = (bet: BetRow) => {
    if (bet.status === 'won') return parseFloat(bet.payout ?? '0') - parseFloat(bet.stake)
    if (bet.status === 'lost') return -parseFloat(bet.stake)
    return null
  }

  if (!fixtures) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 bg-zinc-800" />
        <Skeleton className="h-36 w-full bg-zinc-800 rounded-xl" />
        <Skeleton className="h-16 w-full bg-zinc-800 rounded-xl" />
        <Skeleton className="h-48 w-full bg-zinc-800 rounded-xl" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold text-zinc-100 font-heading">Game</h1>
          </div>
          {selectedFixture && (
            <Button
              onClick={() => setBetModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Bet
            </Button>
          )}
        </div>

        {/* Fixture selector */}
        {gameFixtures.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {gameFixtures.map((f) => {
              const isLive = LIVE_STATUSES.includes(f.status)
              const isSelected = (selectedFixtureId ?? gameFixtures[0]?.id) === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFixtureId(f.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {isLive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                  )}
                  {f.homeTeam} vs {f.awayTeam}
                </button>
              )
            })}
          </div>
        )}

        {!selectedFixture ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Gamepad2 className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-zinc-300 font-semibold mb-2">No fixtures available</h3>
            <p className="text-zinc-500 text-sm">Check back when games are scheduled.</p>
          </div>
        ) : (
          <>
            {/* Featured fixture */}
            <FixtureCard fixture={selectedFixture} large />

            {/* Game stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">Total Bets</p>
                <p className="text-xl font-bold text-zinc-100 tabular-nums">{gameStats.totalBets}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">Total Staked</p>
                <p className="text-lg font-bold text-zinc-100 tabular-nums truncate">
                  {formatCurrency(gameStats.totalStaked, currency)}
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-emerald-500/20 p-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">Won</p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">{gameStats.wonCount}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl border border-rose-500/20 p-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">Lost</p>
                <p className="text-xl font-bold text-rose-400 tabular-nums">{gameStats.lostCount}</p>
              </div>
            </div>

            {/* Highest winner / biggest loser */}
            {(gameStats.topWinner || gameStats.topLoser) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gameStats.topWinner && gameStats.topWinner.pnl > 0 && (
                  <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Highest Winner</p>
                      <p className="text-sm font-semibold text-zinc-100 truncate">{gameStats.topWinner.name}</p>
                    </div>
                    <span className="ml-auto text-emerald-400 font-bold text-sm tabular-nums shrink-0">
                      +{formatCurrency(gameStats.topWinner.pnl, currency)}
                    </span>
                  </div>
                )}
                {gameStats.topLoser && gameStats.topLoser.pnl < 0 && (
                  <div className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/20 rounded-xl px-4 py-3">
                    <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">Biggest Loser</p>
                      <p className="text-sm font-semibold text-zinc-100 truncate">{gameStats.topLoser.name}</p>
                    </div>
                    <span className="ml-auto text-rose-400 font-bold text-sm tabular-nums shrink-0">
                      {formatCurrency(gameStats.topLoser.pnl, currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bets on this game */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Bets on this game
              </h2>

              {!allBets ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                      <Skeleton className="h-4 w-40 bg-zinc-800" />
                      <Skeleton className="h-3 w-56 bg-zinc-800" />
                    </div>
                  ))}
                </div>
              ) : fixtureBets.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Ticket className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-zinc-400 text-sm font-medium">No bets on this game yet</p>
                  <button
                    onClick={() => setBetModalOpen(true)}
                    className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Be the first to add one →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {fixtureBets.map(({ bet, attributedUser }) => {
                    const profit = pnl(bet)
                    const betReactionMap = reactionsByBet[bet.id] ?? {}
                    const isShowingReactionPicker = reactingBetId === bet.id

                    return (
                      <div
                        key={bet.id}
                        className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3 hover:border-zinc-700 transition-colors"
                      >
                        {/* Top row */}
                        <div className="flex items-start gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                              {initials(attributedUser.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-zinc-300">
                                {attributedUser.displayName.split(' ')[0]}
                              </span>
                              <span className="text-xs text-zinc-600">
                                {fmtEst(bet.createdAt, 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-100 mt-0.5 truncate">{bet.description}</p>
                            <p className="text-xs text-zinc-400 truncate">{bet.selection}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <BetBadge status={bet.status} />
                            {profit !== null && (
                              <span className={cn('text-xs font-bold tabular-nums', profit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                {profit >= 0 ? '+' : ''}{formatCurrency(profit, bet.currency)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs tabular-nums text-zinc-500">
                          <span>Odds <span className="text-zinc-300 font-medium">{formatOdds(parseFloat(bet.odds))}</span></span>
                          <span>Stake <span className="text-zinc-300 font-medium">{formatCurrency(parseFloat(bet.stake), bet.currency)}</span></span>
                        </div>

                        {/* Reactions + actions */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-zinc-800/50">
                          {/* Existing reaction groups */}
                          {Object.entries(betReactionMap).map(([emoji, userIds]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(bet.id, emoji)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                                userIds.includes(currentUserId)
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                              )}
                            >
                              <span>{emoji}</span>
                              <span className="tabular-nums font-medium">{userIds.length}</span>
                            </button>
                          ))}

                          {/* Add reaction */}
                          <div className="relative">
                            <button
                              onClick={() => setReactingBetId(isShowingReactionPicker ? null : bet.id)}
                              className="flex items-center justify-center w-6 h-6 rounded-full border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-xs transition-colors"
                            >
                              +
                            </button>
                            {isShowingReactionPicker && (
                              <div className="absolute bottom-8 left-0 flex gap-1 bg-zinc-800 border border-zinc-700 rounded-xl p-2 shadow-xl z-10">
                                {QUICK_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      toggleReaction(bet.id, emoji)
                                      setReactingBetId(null)
                                    }}
                                    className="text-lg hover:scale-125 transition-transform p-0.5"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Settle / delete actions */}
                          <div className="ml-auto flex items-center gap-1">
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
                                <TooltipContent side="left">Settle bet</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          {/* Past Games */}
          {pastFixtures.length > 0 && (
            <div>
              <button
                onClick={() => setShowPastGames((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors mb-3"
              >
                {showPastGames ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Past Games ({pastFixtures.length})
              </button>
              {showPastGames && (
                <div className="space-y-2">
                  {pastFixtures.map((f) => {
                    const betCount = (allBets ?? []).filter(({ bet }) => bet.fixtureId === f.id).length
                    const isSelectedPast = selectedFixtureId === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFixtureId(f.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
                          isSelectedPast
                            ? 'bg-zinc-800 border-zinc-600'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {f.homeTeam} vs {f.awayTeam}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">{f.round ?? 'Group Stage'}</p>
                        </div>
                        {f.homeScore !== null && f.awayScore !== null && (
                          <span className="text-sm font-bold text-zinc-300 tabular-nums shrink-0">
                            {f.homeScore} – {f.awayScore}
                          </span>
                        )}
                        {betCount > 0 && (
                          <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full shrink-0">
                            {betCount} bet{betCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          </>
        )}
      </div>

      <BetModal
        open={betModalOpen}
        fixture={selectedFixture}
        members={members}
        currentUserId={currentUserId}
        onClose={() => {
          setBetModalOpen(false)
          globalMutate('/api/bets')
        }}
      />

      {outcomeModalBet && (
        <BetOutcomeModal
          bet={outcomeModalBet}
          open={!!outcomeModalBet}
          onClose={() => {
            setOutcomeModalBet(null)
            globalMutate('/api/bets')
          }}
        />
      )}
    </TooltipProvider>
  )
}
