import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import DashboardClient from './_DashboardClient'

export default async function DashboardPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])

  if (!user || !league) redirect('/join')

  return (
    <DashboardClient
      displayName={user.displayName}
      leagueName={league.name}
      currentUserId={user.id}
      currency={user.currency}
    />
  )
}
