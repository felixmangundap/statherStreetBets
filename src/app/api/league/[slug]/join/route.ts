import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { leagueMembers } from '@/db/schema'
import { getUserDbRecord, getLeagueBySlug } from '@/lib/queries'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { slug } = await params

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getLeagueBySlug(slug),
  ])

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })
  if (!league) return Response.json({ error: 'League not found' }, { status: 404 })

  await db
    .insert(leagueMembers)
    .values({ leagueId: league.id, userId: user.id })
    .onConflictDoNothing()

  return Response.json({ joined: true, leagueId: league.id })
}
