import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { leagueMembers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'

export async function GET() {
  const { userId: clerkId } = await auth.protect()
  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 404 })
  return Response.json(league)
}

export async function DELETE() {
  const { userId: clerkId } = await auth.protect()
  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!user || !league) return Response.json({ error: 'Not in a league' }, { status: 404 })
  if (league.isAdmin) return Response.json({ error: 'Admins cannot leave their own league' }, { status: 403 })

  await db
    .delete(leagueMembers)
    .where(and(eq(leagueMembers.userId, user.id), eq(leagueMembers.leagueId, league.id)))

  return Response.json({ left: true })
}
