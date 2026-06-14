import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bets } from '@/db/schema'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

async function resolveBetWithPermission(clerkId: string, betId: number) {
  const [user, league, [existing]] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
    db.select().from(bets).where(eq(bets.id, betId)).limit(1),
  ])

  if (!user || !league) return { error: 'Not in a league', status: 403 } as const
  if (!existing) return { error: 'Bet not found', status: 404 } as const
  if (existing.leagueId !== league.id) return { error: 'Forbidden', status: 403 } as const

  const canAct =
    existing.userId === user.id ||
    existing.placedByUserId === user.id ||
    league.isAdmin

  if (!canAct) return { error: 'Forbidden', status: 403 } as const

  return { user, league, existing }
}

const UpdateBetSchema = z.object({
  status: z.enum(['pending', 'won', 'lost', 'void', 'cashed_out']).optional(),
  payout: z.string().optional(),
  notes: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { id } = await params
  const betId = parseInt(id)

  const result = await resolveBetWithPermission(clerkId, betId)
  if ('error' in result) return Response.json({ error: result.error }, { status: result.status })

  const body = await req.json()
  const parsed = UpdateBetSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const [updated] = await db
    .update(bets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(bets.id, betId))
    .returning()

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { id } = await params
  const betId = parseInt(id)

  const result = await resolveBetWithPermission(clerkId, betId)
  if ('error' in result) return Response.json({ error: result.error }, { status: result.status })

  await db.delete(bets).where(eq(bets.id, betId))
  return new Response(null, { status: 204 })
}
