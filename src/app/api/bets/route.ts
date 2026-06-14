import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bets, betLegs, leagueMembers, users } from '@/db/schema'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import { calcCombinedOdds } from '@/lib/utils'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'

const LegSchema = z.object({
  description: z.string().min(1),
  selection: z.string().min(1),
  odds: z.string(),
  fixtureId: z.number().optional(),
})

const CreateBetSchema = z.object({
  userId: z.number(),
  fixtureId: z.number().optional(),
  betType: z.enum(['match_winner', 'over_under', 'btts', 'accumulator', 'custom']),
  description: z.string().min(1),
  selection: z.string().min(1),
  odds: z.string(),
  stake: z.string(),
  currency: z.string().length(3),
  notes: z.string().optional(),
  legs: z.array(LegSchema).optional(),
})

export async function POST(req: Request) {
  const { userId: clerkId } = await auth.protect()

  const body = await req.json()
  const parsed = CreateBetSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
  }

  const [logger, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!logger || !league) return Response.json({ error: 'Not in a league' }, { status: 403 })

  const { userId, legs, ...betData } = parsed.data

  // Verify attributed user is in the same league
  const memberCheck = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, league.id), eq(leagueMembers.userId, userId)))
    .limit(1)

  if (!memberCheck[0]) {
    return Response.json({ error: 'Attributed user is not in your league' }, { status: 403 })
  }

  // For accumulators, compute combined odds server-side
  let finalOdds = betData.odds
  if (betData.betType === 'accumulator' && legs && legs.length > 0) {
    const combined = calcCombinedOdds(legs.map((l) => ({ odds: parseFloat(l.odds) })))
    finalOdds = combined.toFixed(4)
  }

  const [bet] = await db
    .insert(bets)
    .values({
      userId,
      placedByUserId: userId !== logger.id ? logger.id : undefined,
      leagueId: league.id,
      fixtureId: betData.fixtureId,
      betType: betData.betType,
      description: betData.description,
      selection: betData.selection,
      odds: finalOdds,
      stake: betData.stake,
      currency: betData.currency,
      notes: betData.notes,
    })
    .returning()

  if (betData.betType === 'accumulator' && legs && legs.length > 0) {
    await db.insert(betLegs).values(
      legs.map((leg) => ({
        betId: bet.id,
        fixtureId: leg.fixtureId,
        description: leg.description,
        selection: leg.selection,
        odds: leg.odds,
      }))
    )
  }

  return Response.json(bet, { status: 201 })
}

export async function GET(_req: Request) {
  const { userId: clerkId } = await auth.protect()

  const league = await getUserLeague(clerkId)
  if (!league) return Response.json({ error: 'Not in a league' }, { status: 403 })

  const rows = await db
    .select({
      bet: bets,
      attributedUser: { id: users.id, displayName: users.displayName },
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id))
    .where(eq(bets.leagueId, league.id))
    .orderBy(desc(bets.createdAt))

  return Response.json(rows)
}
