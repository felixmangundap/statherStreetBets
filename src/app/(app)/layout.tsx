import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserLeague } from '@/lib/queries'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const league = await getUserLeague(clerkId)
  if (!league) redirect('/join')

  return (
    <div className="flex h-dvh bg-zinc-950">
      <Sidebar className="hidden lg:flex lg:shrink-0" leagueName={league.name} />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {children}
      </main>
      <BottomNav className="lg:hidden" />
    </div>
  )
}
