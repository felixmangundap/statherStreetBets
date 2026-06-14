'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/fetcher'
import {
  calcROI,
  calcWinRate,
  formatCurrency,
  formatOdds,
  formatPercent,
  cn,
} from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import StatCard from '@/components/StatCard'
import PLChart from '@/components/PLChart'
import BetBadge from '@/components/BetBadge'
import BetModal from '@/components/BetModal'
import FixtureCard from '@/components/FixtureCard'
import {
  Users,
  Ticket,
  DollarSign,
  Plus,
  TrendingUp,
  ArrowUpRight,
  Percent,
  Target,
  Hash,
} from 'lucide-react'
import type { Fixture } from '@/db/schema'

interface DashboardClientProps {
  displayName: string
  leagueName: string
  currentUserId: number
  currency: string
}

interface LeaderboardRow {
  userId: number
  displayName: string
  totalStaked: string
  totalReturned: string
  netPnl: string
  betCount: number
  wonCount: number
}

interface MemberData {
  id: number
  displayName: string
}

interface BetRow {
  id: number
  userId: number
  placedByUserId: number | null
  leagueId: number
  fixtureId: number | null
  betType: string
  description: string
  selection: string
  odds: string
  stake: string
  currency: string
  status: string
  payout: string | null
  notes: string | null
  createdAt: string
}

interface BetWithUser {
  bet: BetRow
  attributedUser: { id: number; displayName: string }
}

interface DashboardData {
  totalStaked: number
  totalReturned: number
  netPnl: number
  roi: number
  winRate: number
  betsPlaced: number
  pendingBets: number
  chartData: Array<{ date: string; pnl: number }>
  bestBet: {
    description: string
    selection: string
    odds: string
    stake: string
    payout: string | null
    status: string
  } | null
  worstBet: {
    description: string
    selection: string
    odds: string
    stake: string
    status: string
  } | null
  currency: string
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-zinc-300',
  3: 'text-amber-700',
}

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

export default function DashboardClient({
  displayName,
  leagueName,
  currentUserId,
  currency,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'league' | 'my-stats'>('league')
  const [betModalOpen, setBetModalOpen] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)

  const { data: leaderboard } = useSWR<LeaderboardRow[]>('/api/leaderboard', fetcher, {
    refreshInterval: 30_000,
  })
  const { data: fixtures } = useSWR<Fixture[]>('/api/fixtures', fetcher)
  const { data: members } = useSWR<MemberData[]>('/api/league/members', fetcher)
  const { data: dashboard } = useSWR<DashboardData>('/api/dashboard', fetcher)
  const { data: allBets } = useSWR<BetWithUser[]>('/api/bets', fetcher, {
    refreshInterval: 30_000,
  })

  const liveFixtures = useMemo(
    () => (fixtures ?? []).filter((f) => f.status === 'LIVE'),
    [fixtures]
  )

  const upcomingFixtures = useMemo(
    () => (fixtures ?? []).filter((f) => f.status === 'NS').slice(0, 6),
    [fixtures]
  )

  const pendingBets = useMemo(
    () => (allBets ?? []).filter(({ bet }) => bet.status === 'pending'),
    [allBets]
  )

  const leagueSummary = useMemo(
    () => ({
      memberCount: leaderboard?.length ?? 0,
      totalBets: leaderboard?.reduce((s, r) => s + Number(r.betCount), 0) ?? 0,
      totalStaked: leaderboard?.reduce((s, r) => s + parseFloat(r.totalStaked), 0) ?? 0,
    }),
    [leaderboard]
  )

  const enrichedLeaderboard = useMemo(
    () =>
      (leaderboard ?? [])
        .map((row) => ({
          ...row,
          netPnlNum: parseFloat(row.netPnl),
          roi: calcROI(parseFloat(row.totalStaked), parseFloat(row.netPnl)),
          winRate: calcWinRate(row.wonCount, row.betCount),
        }))
        .sort((a, b) => b.netPnlNum - a.netPnlNum),
    [leaderboard]
  )

  function openBetModal(fixture?: Fixture) {
    setSelectedFixture(fixture ?? null)
    setBetModalOpen(true)
  }

  function closeBetModal() {
    setBetModalOpen(false)
    setSelectedFixture(null)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 font-heading">
          {greeting}, {displayName.split(' ')[0]}
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">{leagueName} · WC2026</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'league' | 'my-stats')}>
        <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-1 gap-1">
          <TabsTrigger
            value="league"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 text-sm px-4"
          >
            League
          </TabsTrigger>
          <TabsTrigger
            value="my-stats"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 text-zinc-500 text-sm px-4"
          >
            My Stats
          </TabsTrigger>
        </TabsList>

        {/* ── League Tab ── */}
        <TabsContent value="league" className="space-y-6 mt-6">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            {leaderboard ? (
              <>
                <StatCard
                  label="Members"
                  value={leagueSummary.memberCount.toString()}
                  icon={<Users className="w-4 h-4" />}
                />
                <StatCard
                  label="Total Bets"
                  value={leagueSummary.totalBets.toString()}
                  icon={<Ticket className="w-4 h-4" />}
                />
                <StatCard
                  label="Total Staked"
                  value={formatCurrency(leagueSummary.totalStaked, currency)}
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                  <Skeleton className="h-3 w-16 bg-zinc-800" />
                  <Skeleton className="h-7 w-24 bg-zinc-800" />
                </div>
              ))
            )}
          </div>

          {/* Add Bet button */}
          <div className="flex justify-end">
            <Button
              onClick={() => openBetModal()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Bet
            </Button>
          </div>

          {/* Standings */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Standings
            </h2>
            {!leaderboard ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <Skeleton className="w-6 h-5 bg-zinc-800" />
                    <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
                    <Skeleton className="h-4 w-28 bg-zinc-800" />
                    <div className="ml-auto flex gap-6">
                      <Skeleton className="h-4 w-16 bg-zinc-800" />
                      <Skeleton className="h-4 w-10 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : enrichedLeaderboard.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No members yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900">
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 w-10">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 min-w-[130px]">Player</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Net P&amp;L</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Bets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedLeaderboard.map((row, idx) => {
                      const rank = idx + 1
                      const rankColor = RANK_COLORS[rank] ?? 'text-zinc-500'
                      const initials = row.displayName
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                      const isPositive = row.netPnlNum > 0
                      return (
                        <tr
                          key={row.userId}
                          className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className={cn('font-bold text-sm tabular-nums', rankColor)}>{rank}</span>
                          </td>
                          <td className="py-3 px-4">
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
                          <td
                            className={cn(
                              'py-3 px-4 text-right font-bold tabular-nums text-sm',
                              isPositive
                                ? 'text-emerald-400'
                                : row.netPnlNum < 0
                                ? 'text-rose-400'
                                : 'text-zinc-400'
                            )}
                          >
                            {isPositive ? '+' : ''}
                            {formatCurrency(row.netPnlNum, currency)}
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
            <div className="mt-2 text-right">
              <Link
                href="/leaderboard"
                className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
              >
                View full leaderboard →
              </Link>
            </div>
          </div>

          {/* Active Bets table */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Active Bets
            </h2>
            {!allBets ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <Skeleton className="w-6 h-6 rounded-full bg-zinc-800" />
                    <Skeleton className="h-4 w-24 bg-zinc-800" />
                    <div className="ml-auto flex gap-4">
                      <Skeleton className="h-4 w-12 bg-zinc-800" />
                      <Skeleton className="h-4 w-16 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingBets.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No active bets.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900">
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Player</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 min-w-[120px]">Bet</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Odds</th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-zinc-400">Stake</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBets.map(({ bet, attributedUser }) => (
                      <tr
                        key={bet.id}
                        className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-[10px]">
                                {attributedUser.displayName
                                  .split(' ')
                                  .map((w: string) => w[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-zinc-300 text-xs whitespace-nowrap">
                              {attributedUser.displayName.split(' ')[0]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-zinc-100 text-xs font-medium truncate max-w-[150px]">
                            {bet.description}
                          </p>
                          <p className="text-zinc-500 text-[11px] truncate max-w-[150px]">{bet.selection}</p>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300 tabular-nums text-xs">
                          {formatOdds(parseFloat(bet.odds))}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300 tabular-nums text-xs">
                          {formatCurrency(parseFloat(bet.stake), bet.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live Now */}
          {liveFixtures.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveFixtures.map((f) => {
                  const fixtureBets = (allBets ?? []).filter(
                    ({ bet }) => bet.fixtureId === f.id && bet.status === 'pending'
                  )
                  return (
                    <div key={f.id} className="space-y-2">
                      <FixtureCard fixture={f} onAddBet={openBetModal} large />
                      {fixtureBets.length > 0 && (
                        <div className="bg-zinc-800/40 rounded-lg border border-zinc-700/50 divide-y divide-zinc-800/50">
                          {fixtureBets.map(({ bet, attributedUser }) => (
                            <div key={bet.id} className="flex items-center gap-3 px-3 py-2">
                              <span className="text-zinc-400 text-xs font-medium shrink-0 w-16 truncate">
                                {attributedUser.displayName.split(' ')[0]}
                              </span>
                              <span className="text-zinc-300 text-xs flex-1 truncate">{bet.selection}</span>
                              <span className="text-zinc-400 text-xs tabular-nums shrink-0">
                                {formatOdds(parseFloat(bet.odds))}
                              </span>
                              <span className="text-emerald-400 text-xs tabular-nums font-medium shrink-0">
                                {formatCurrency(parseFloat(bet.stake), bet.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming fixtures */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Upcoming Fixtures
            </h2>
            {!fixtures ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                    <Skeleton className="h-3 w-20 bg-zinc-800" />
                    <Skeleton className="h-10 w-full bg-zinc-800 rounded-lg" />
                    <Skeleton className="h-8 w-full bg-zinc-800 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : upcomingFixtures.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No upcoming fixtures.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingFixtures.map((f) => (
                  <FixtureCard key={f.id} fixture={f} onAddBet={openBetModal} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── My Stats Tab ── */}
        <TabsContent value="my-stats" className="space-y-6 mt-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {dashboard ? (
              <>
                <StatCard
                  label="Total Staked"
                  value={formatCurrency(dashboard.totalStaked, dashboard.currency)}
                  icon={<DollarSign className="w-4 h-4" />}
                />
                <StatCard
                  label="Total Returned"
                  value={formatCurrency(dashboard.totalReturned, dashboard.currency)}
                  icon={<ArrowUpRight className="w-4 h-4" />}
                />
                <StatCard
                  label="Net P&L"
                  value={(dashboard.netPnl >= 0 ? '+' : '') + formatCurrency(dashboard.netPnl, dashboard.currency)}
                  delta={dashboard.roi}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <StatCard
                  label="ROI"
                  value={formatPercent(dashboard.roi)}
                  delta={dashboard.roi}
                  icon={<Percent className="w-4 h-4" />}
                />
                <StatCard
                  label="Win Rate"
                  value={`${dashboard.winRate.toFixed(1)}%`}
                  subValue={`${leaderboard?.find((r) => r.userId === currentUserId)?.wonCount ?? 0} won`}
                  icon={<Target className="w-4 h-4" />}
                />
                <StatCard
                  label="Bets Placed"
                  value={dashboard.betsPlaced.toString()}
                  subValue={dashboard.pendingBets > 0 ? `${dashboard.pendingBets} pending` : undefined}
                  icon={<Hash className="w-4 h-4" />}
                />
              </>
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
                  <Skeleton className="h-3 w-20 bg-zinc-800" />
                  <Skeleton className="h-7 w-28 bg-zinc-800" />
                  <Skeleton className="h-3 w-16 bg-zinc-800" />
                </div>
              ))
            )}
          </div>

          {/* P&L chart */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Cumulative P&amp;L</h2>
            {dashboard ? (
              <PLChart data={dashboard.chartData} currency={dashboard.currency} />
            ) : (
              <Skeleton className="h-[280px] w-full bg-zinc-800 rounded-lg" />
            )}
          </div>

          {/* Best / Worst bets */}
          {dashboard && (dashboard.bestBet || dashboard.worstBet) && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Highlights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dashboard.bestBet && (
                  <div className="bg-zinc-900 rounded-xl border border-emerald-500/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Best Bet</span>
                      <BetBadge status={dashboard.bestBet.status as never} />
                    </div>
                    <p className="text-zinc-100 text-sm font-medium truncate">{dashboard.bestBet.description}</p>
                    <p className="text-zinc-400 text-xs truncate">{dashboard.bestBet.selection}</p>
                    <div className="flex items-center gap-3 text-xs tabular-nums pt-1">
                      <span className="text-zinc-500">
                        Odds <span className="text-zinc-300">{formatOdds(parseFloat(dashboard.bestBet.odds))}</span>
                      </span>
                      <span className="text-zinc-500">
                        Stake{' '}
                        <span className="text-zinc-300">
                          {formatCurrency(parseFloat(dashboard.bestBet.stake), dashboard.currency)}
                        </span>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        +{formatCurrency(
                          parseFloat(dashboard.bestBet.payout ?? '0') - parseFloat(dashboard.bestBet.stake),
                          dashboard.currency
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {dashboard.worstBet && (
                  <div className="bg-zinc-900 rounded-xl border border-rose-500/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Biggest Loss</span>
                      <BetBadge status={dashboard.worstBet.status as never} />
                    </div>
                    <p className="text-zinc-100 text-sm font-medium truncate">{dashboard.worstBet.description}</p>
                    <p className="text-zinc-400 text-xs truncate">{dashboard.worstBet.selection}</p>
                    <div className="flex items-center gap-3 text-xs tabular-nums pt-1">
                      <span className="text-zinc-500">
                        Odds <span className="text-zinc-300">{formatOdds(parseFloat(dashboard.worstBet.odds))}</span>
                      </span>
                      <span className="text-zinc-500">
                        Stake{' '}
                        <span className="text-zinc-300">
                          {formatCurrency(parseFloat(dashboard.worstBet.stake), dashboard.currency)}
                        </span>
                      </span>
                      <span className="text-rose-400 font-semibold">
                        -{formatCurrency(parseFloat(dashboard.worstBet.stake), dashboard.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* BetModal outside tabs so it doesn't unmount on tab switch */}
      <BetModal
        open={betModalOpen}
        fixture={selectedFixture}
        members={members ?? []}
        currentUserId={currentUserId}
        onClose={closeBetModal}
      />
    </div>
  )
}
