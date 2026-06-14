import { auth } from '@clerk/nextjs/server'
import { getUserLeague, getLeaderboardStats } from '@/lib/queries'

export async function GET() {
  const { userId: clerkId } = await auth.protect()
  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 403 })
  return Response.json(await getLeaderboardStats(league.id))
}
