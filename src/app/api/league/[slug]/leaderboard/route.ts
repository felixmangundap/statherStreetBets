import { auth } from '@clerk/nextjs/server'
import { getLeagueBySlug, getUserLeague, getLeaderboardStats } from '@/lib/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId: clerkId } = await auth.protect()
  const { slug } = await params

  const [league, userLeague] = await Promise.all([
    getLeagueBySlug(slug),
    getUserLeague(clerkId),
  ])

  if (!league) return Response.json({ error: 'League not found' }, { status: 404 })
  if (!userLeague || userLeague.id !== league.id) {
    return Response.json({ error: 'Not a member' }, { status: 403 })
  }

  return Response.json(await getLeaderboardStats(league.id))
}
