import { db } from '@/db'
import { fixtures } from '@/db/schema'
import { fetchWC2026Fixtures } from '@/lib/api-football'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
