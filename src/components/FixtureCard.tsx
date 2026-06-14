'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, fmtEst } from '@/lib/utils'
import type { Fixture } from '@/db/schema'

const LIVE_STATUSES = ['LIVE', '1H', '2H', 'HT', 'ET', 'P']
const FINISHED_STATUSES = ['FT', 'AET', 'PEN']

function TeamLogo({ name, logo, large }: { name: string; logo?: string | null; large?: boolean }) {
  const sizeClass = large ? 'w-10 h-10' : 'w-8 h-8'
  if (logo) {
    return (
      <div className={cn('relative shrink-0', sizeClass)}>
        <Image src={logo} alt={name} fill className="object-contain" unoptimized />
      </div>
    )
  }
  return (
    <div className={cn('rounded-full bg-zinc-800 flex items-center justify-center shrink-0', sizeClass)}>
      <span className={cn('font-bold text-zinc-400', large ? 'text-sm' : 'text-xs')}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

interface FixtureCardProps {
  fixture: Fixture
  onAddBet?: (fixture: Fixture) => void
  large?: boolean
}

export default function FixtureCard({ fixture, onAddBet, large }: FixtureCardProps) {
  const isLive = LIVE_STATUSES.includes(fixture.status)
  const isFinished = FINISHED_STATUSES.includes(fixture.status)
  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null

  return (
    <div className={cn(
      'bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col gap-3 hover:border-zinc-700 transition-colors',
      large ? 'p-5' : 'p-4'
    )}>
      {/* Round + status */}
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs">{fixture.round ?? 'Group Stage'}</span>
        {isLive ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            LIVE · {fixture.status}
          </span>
        ) : isFinished ? (
          <span className="text-xs text-zinc-500 font-medium">FT</span>
        ) : (
          <span className="text-xs text-amber-400 font-medium">
            {fmtEst(fixture.kickoffAt, 'MMM d · HH:mm')}
          </span>
        )}
      </div>

      {/* Teams and score */}
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamLogo name={fixture.homeTeam} logo={fixture.homeTeamLogo} large={large} />
          <span className={cn('font-semibold text-zinc-100 truncate', large ? 'text-base' : 'text-sm')}>
            {fixture.homeTeam}
          </span>
        </div>

        {/* Score / vs */}
        <div className={cn('text-center shrink-0', large ? 'min-w-[72px]' : 'min-w-[56px]')}>
          {isFinished && hasScore ? (
            <div className={cn('font-bold tabular-nums leading-none text-zinc-100', large ? 'text-3xl' : 'text-xl')}>
              {fixture.homeScore} – {fixture.awayScore}
            </div>
          ) : isLive ? (
            <div className={cn('font-bold text-zinc-500', large ? 'text-base' : 'text-sm')}>vs</div>
          ) : (
            <div className="text-zinc-500 text-xs font-medium">
              {fmtEst(fixture.kickoffAt, 'MMM d')}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className={cn('font-semibold text-zinc-100 truncate text-right', large ? 'text-base' : 'text-sm')}>
            {fixture.awayTeam}
          </span>
          <TeamLogo name={fixture.awayTeam} logo={fixture.awayTeamLogo} large={large} />
        </div>
      </div>

      {/* Footer */}
      {onAddBet && (
        <div className="flex justify-end pt-1 border-t border-zinc-800/50">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAddBet(fixture)}
            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Bet
          </Button>
        </div>
      )}
    </div>
  )
}
