import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { users, leagues, leagueMembers, bets } from '@/db/schema'
import { eq, and, ne, sql, desc } from 'drizzle-orm'
import type { League, User } from '@/db/schema'

export async function getUserDbRecord(clerkId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)

  if (result[0]) return result[0]

  // Webhook may not have fired (e.g. local dev) — provision on first API call
  const clerk = await clerkClient()
  const clerkUser = await clerk.users.getUser(clerkId)
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0]

  const [created] = await db
    .insert(users)
    .values({ clerkId, email, displayName })
    .onConflictDoNothing()
    .returning()

  return created ?? null
}

export async function getUserLeague(
  clerkId: string
): Promise<(League & { isAdmin: boolean }) | null> {
  const user = await getUserDbRecord(clerkId)
  if (!user) return null

  const result = await db
    .select({ league: leagues, isAdmin: leagues.adminId })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, user.id))
    .orderBy(desc(leagueMembers.joinedAt))
    .limit(1)

  if (!result[0]) return null
  return { ...result[0].league, isAdmin: result[0].isAdmin === user.id }
}

export async function getLeagueMembers(leagueId: number): Promise<User[]> {
  const result = await db
    .select({ user: users })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId))
  return result.map((r) => r.user)
}

export async function getLeagueBySlug(slug: string): Promise<League | null> {
  const result = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, slug))
    .limit(1)
  return result[0] ?? null
}

export interface LeaderboardRow {
  userId: number
  displayName: string
  totalStaked: string
  totalReturned: string
  netPnl: string
  betCount: number
  wonCount: number
}

export async function getLeaderboardStats(leagueId: number): Promise<LeaderboardRow[]> {
  return db
    .select({
      userId: users.id,
      displayName: users.displayName,
      totalStaked: sql<string>`coalesce(sum(${bets.stake}), 0)`,
      totalReturned: sql<string>`coalesce(sum(${bets.payout}), 0)`,
      netPnl: sql<string>`coalesce(sum(${bets.payout}), 0) - coalesce(sum(${bets.stake}), 0)`,
      betCount: sql<number>`count(${bets.id})`,
      wonCount: sql<number>`count(case when ${bets.status} = 'won' then 1 end)`,
    })
    .from(leagueMembers)
    .innerJoin(users, eq(leagueMembers.userId, users.id))
    .leftJoin(
      bets,
      and(eq(bets.userId, users.id), eq(bets.leagueId, leagueId), ne(bets.status, 'void'))
    )
    .where(eq(leagueMembers.leagueId, leagueId))
    .groupBy(users.id, users.displayName)
}
