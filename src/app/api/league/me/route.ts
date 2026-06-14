import { auth } from '@clerk/nextjs/server'
import { getUserLeague } from '@/lib/queries'

export async function GET() {
  const { userId: clerkId } = await auth.protect()
  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 404 })
  return Response.json(league)
}
