import { auth } from '@clerk/nextjs/server'
import { getUserLeague, getLeagueMembers } from '@/lib/queries'

export async function GET() {
  const { userId: clerkId } = await auth.protect()
  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 403 })
  const members = await getLeagueMembers(league.id)
  return Response.json(members)
}
