import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { bets } from '@/db/schema'
import { getUserDbRecord, getUserLeague } from '@/lib/queries'
import { eq, and, inArray, asc, ne } from 'drizzle-orm'
import { calcROI, calcWinRate } from '@/lib/utils'

export async function GET() {
  const { userId: clerkId } = await auth.protect()

  const [user, league] = await Promise.all([
    getUserDbRecord(clerkId),
    getUserLeague(clerkId),
  ])
  if (!user || !league) return Response.json({ error: 'Not in a league' }, { status: 403 })

  const allBets = await db
    .select()
    .from(bets)
    .where(and(eq(bets.userId, user.id), ne(bets.status, 'void')))
    .orderBy(asc(bets.createdAt))

  const settledBets = allBets.filter((b) =>
    ['won', 'lost', 'cashed_out'].includes(b.status)
  )

  const totalStaked = allBets.reduce((s, b) => s + parseFloat(b.stake), 0)
  const totalReturned = settledBets.reduce((s, b) => s + parseFloat(b.payout ?? '0'), 0)
  const netPnl = totalReturned - settledBets.reduce((s, b) => s + parseFloat(b.stake), 0)
  const roi = calcROI(settledBets.reduce((s, b) => s + parseFloat(b.stake), 0), netPnl)
  const wonCount = allBets.filter((b) => b.status === 'won').length
  const settledCount = settledBets.length
  const winRate = calcWinRate(wonCount, settledCount)

  // Cumulative P&L time series
  let running = 0
  const chartData = settledBets.map((b) => {
    const delta =
      b.status === 'won'
        ? parseFloat(b.payout ?? '0') - parseFloat(b.stake)
        : -parseFloat(b.stake)
    running += delta
    return {
      date: b.createdAt.toISOString(),
      pnl: Math.round(running * 100) / 100,
    }
  })

  // Best and worst single bets
  const wonBets = allBets.filter((b) => b.status === 'won')
  const lostBets = allBets.filter((b) => b.status === 'lost')
  const bestBet = wonBets.sort(
    (a, b) =>
      parseFloat(b.payout ?? '0') -
      parseFloat(b.stake) -
      (parseFloat(a.payout ?? '0') - parseFloat(a.stake))
  )[0]
  const worstBet = lostBets.sort(
    (a, b) => parseFloat(b.stake) - parseFloat(a.stake)
  )[0]

  return Response.json({
    totalStaked,
    totalReturned,
    netPnl,
    roi,
    winRate,
    betsPlaced: allBets.length,
    pendingBets: allBets.filter((b) => b.status === 'pending').length,
    chartData,
    bestBet,
    worstBet,
    currency: user.currency,
  })
}
