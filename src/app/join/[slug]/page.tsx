import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLeagueBySlug } from '@/lib/queries'
import { db } from '@/db'
import { leagueMembers, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import JoinButton from './_JoinButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function JoinSlugPage({ params }: Props) {
  const { slug } = await params
  const league = await getLeagueBySlug(slug)

  if (!league) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-4">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-rose-500">Invalid invite link</CardTitle>
            <CardDescription className="text-zinc-400">
              This league invite link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="border-zinc-700 text-zinc-300">
              <Link href="/join">Create your own league</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const memberRows = await db
    .select()
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, league.id))

  const { userId: clerkId } = await auth()

  if (clerkId) {
    const [userRecord] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
    if (userRecord) {
      const [existing] = await db
        .select()
        .from(leagueMembers)
        .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, userRecord.id)))
        .limit(1)
      if (existing) redirect('/dashboard')
    }
  }

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/join/${slug}`)}`

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="w-8 h-8 text-emerald-500" />
          <span className="font-heading font-bold text-2xl text-zinc-100">StatherStreetBets</span>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100">You&apos;ve been invited</CardTitle>
            <p className="text-xl font-semibold text-zinc-100 mt-1">{league.name}</p>
            <div className="flex items-center gap-2 text-zinc-400 text-sm mt-2">
              <Users className="w-4 h-4" />
              <span>
                {memberRows.length} member{memberRows.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {clerkId ? (
              <JoinButton slug={slug} leagueName={league.name} />
            ) : (
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                <Link href={signInUrl}>Sign in to Join</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
