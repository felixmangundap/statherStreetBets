'use client'

import { useState } from 'react'
import { parseISO } from 'date-fns'
import { fmtEst } from '@/lib/utils'
import useSWR from 'swr'
import FixtureCard from '@/components/FixtureCard'
import BetModal from '@/components/BetModal'
import { fetcher } from '@/lib/fetcher'
import type { Fixture } from '@/db/schema'
import { Calendar, RefreshCw } from 'lucide-react'

interface ScheduleClientProps {
  initialFixtures: Fixture[]
  leagueSlug: string
  leagueMembers: Array<{ id: number; displayName: string }>
  currentUserId: number
}

function groupByDate(fixtures: Fixture[]): Map<string, Fixture[]> {
  const map = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const key = fmtEst(f.kickoffAt, 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }
  return map
}

export default function ScheduleClient({
  initialFixtures,
  leagueSlug,
  leagueMembers,
  currentUserId,
}: ScheduleClientProps) {
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)

  const { data, isValidating, mutate } = useSWR<Fixture[]>('/api/fixtures', fetcher, {
    fallbackData: initialFixtures,
    refreshInterval: 60_000,
  })

  const fixtures = data ?? initialFixtures
  const grouped = groupByDate(fixtures)
  const dateKeys = Array.from(grouped.keys()).sort()

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <Calendar className="w-12 h-12 text-zinc-700 mb-4" />
        <h3 className="text-zinc-300 font-semibold mb-2">No fixtures loaded yet</h3>
        <p className="text-zinc-500 text-sm max-w-xs">
          Fixtures sync automatically every 5 minutes from API-Football. Check back soon or trigger
          a manual sync.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-500 text-sm">{fixtures.length} matches</p>
        <button
          onClick={() => mutate()}
          disabled={isValidating}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-6">
        {dateKeys.map((dateKey) => {
          const dayFixtures = grouped.get(dateKey)!
          const dateLabel = fmtEst(parseISO(dateKey), 'EEEE, MMMM d')

          return (
            <section key={dateKey}>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 sticky top-0 bg-zinc-950 py-2 z-10">
                {dateLabel}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dayFixtures.map((fixture) => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    onAddBet={setSelectedFixture}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {selectedFixture && (
        <BetModal
          fixture={selectedFixture}
          members={leagueMembers}
          currentUserId={currentUserId}
          open={!!selectedFixture}
          onClose={() => setSelectedFixture(null)}
        />
      )}
    </>
  )
}
