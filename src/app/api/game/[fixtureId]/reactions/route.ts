import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bets, betReactions } from '@/db/schema'
import { getUserLeague } from '@/lib/queries'
import { eq, and, inArray } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { fixtureId } = await params
  const fixtureIdNum = parseInt(fixtureId)

  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 403 })

  // Get all bet IDs for this fixture in this league
  const fixtureBets = await db
    .select({ id: bets.id })
    .from(bets)
    .where(and(eq(bets.fixtureId, fixtureIdNum), eq(bets.leagueId, league.id)))

  if (!fixtureBets.length) return Response.json([])

  const betIds = fixtureBets.map((b) => b.id)
  const reactions = await db
    .select()
    .from(betReactions)
    .where(inArray(betReactions.betId, betIds))

  return Response.json(reactions)
}
