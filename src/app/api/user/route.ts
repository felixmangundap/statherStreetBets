import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, leagues } from '@/db/schema'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
})

const UpdateLeagueSchema = z.object({
  leagueName: z.string().min(1).max(100).optional(),
  regenerateSlug: z.boolean().optional(),
})

export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth.protect()

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()

  // Check if it's a user update or league update
  if ('leagueName' in body || 'regenerateSlug' in body) {
    if (!league?.isAdmin) return Response.json({ error: 'Admin only' }, { status: 403 })
    const parsed = UpdateLeagueSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const updates: Record<string, string> = {}
    if (parsed.data.leagueName) updates.name = parsed.data.leagueName
    if (parsed.data.regenerateSlug) updates.slug = nanoid(8)

    const [updated] = await db
      .update(leagues)
      .set(updates)
      .where(eq(leagues.id, league.id))
      .returning()

    return Response.json(updated)
  }

  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const [updated] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, user.id))
    .returning()

  return Response.json(updated)
}
