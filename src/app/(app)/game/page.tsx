import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserDbRecord, getUserLeague, getLeagueMembers } from '@/lib/queries'
import GameClient from './_GameClient'

export default async function GamePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])

  if (!user || !league) redirect('/join')

  const members = await getLeagueMembers(league.id)

  return (
    <GameClient
      currentUserId={user.id}
      currency={user.currency}
      members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
    />
  )
}
