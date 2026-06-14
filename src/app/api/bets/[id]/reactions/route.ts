import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bets, betReactions } from '@/db/schema'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const ToggleSchema = z.object({
  emoji: z.string().min(1).max(8),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { id } = await params
  const betId = parseInt(id)

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!user || !league) return Response.json({ error: 'Not in a league' }, { status: 403 })

  // Verify bet is in the user's league
  const [bet] = await db.select({ leagueId: bets.leagueId }).from(bets).where(eq(bets.id, betId)).limit(1)
  if (!bet || bet.leagueId !== league.id) return Response.json({ error: 'Bet not found' }, { status: 404 })

  const body = await req.json()
  const parsed = ToggleSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid emoji' }, { status: 400 })

  const { emoji } = parsed.data

  // Toggle: delete if exists, insert if not
  const [existing] = await db
    .select()
    .from(betReactions)
    .where(
      and(
        eq(betReactions.betId, betId),
        eq(betReactions.userId, user.id),
        eq(betReactions.emoji, emoji)
      )
    )
    .limit(1)

  if (existing) {
    await db.delete(betReactions).where(eq(betReactions.id, existing.id))
    return Response.json({ action: 'removed' })
  } else {
    await db.insert(betReactions).values({ betId, userId: user.id, emoji })
    return Response.json({ action: 'added' })
  }
}
