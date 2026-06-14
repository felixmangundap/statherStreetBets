import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { fixtures } from '@/db/schema'
import { getUserLeague } from '@/lib/queries'
import { fetchWC2026Fixtures } from '@/lib/api-football'

export async function POST() {
  const { userId } = await auth.protect()

  const league = await getUserLeague(userId)
  if (!league?.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const matches = await fetchWC2026Fixtures()

  let synced = 0
  for (const m of matches) {
    await db
      .insert(fixtures)
      .values({
        apiFootballId: m.id,
        season: 2026,
        round: m.group ? `Group ${m.group}` : m.type,
        homeTeam: m.homeTeamName,
        awayTeam: m.awayTeamName,
        kickoffAt: m.kickoffAt,
        status: m.status,
        homeScore: m.homeScore ?? undefined,
        awayScore: m.awayScore ?? undefined,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: fixtures.apiFootballId,
        set: {
          homeTeam: m.homeTeamName,
          awayTeam: m.awayTeamName,
          status: m.status,
          homeScore: m.homeScore ?? undefined,
          awayScore: m.awayScore ?? undefined,
          syncedAt: new Date(),
        },
      })
    synced++
  }

  return Response.json({ synced })
}
