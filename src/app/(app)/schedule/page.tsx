import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { fixtures } from '@/db/schema'
import { asc } from 'drizzle-orm'
import { getUserDbRecord, getUserLeague, getLeagueMembers } from '@/lib/queries'
import ScheduleClient from './_ScheduleClient'

export default async function SchedulePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!user || !league) redirect('/join')

  const [allFixtures, members] = await Promise.all([
    db.select().from(fixtures).orderBy(asc(fixtures.kickoffAt)),
    getLeagueMembers(league.id),
  ])

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 font-heading">Schedule</h1>
        <p className="text-zinc-500 text-sm mt-0.5">WC2026 fixtures</p>
      </div>

      <ScheduleClient
        initialFixtures={allFixtures}
        leagueSlug={league.slug}
        leagueMembers={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
        currentUserId={user.id}
      />
    </div>
  )
}
