import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { leagues, leagueMembers } from '@/db/schema'
import { getUserDbRecord } from '@/lib/queries'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const CreateLeagueSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  const { userId: clerkId } = await auth.protect()

  const body = await req.json()
  const parsed = CreateLeagueSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const user = await getUserDbRecord(clerkId)
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  const slug = nanoid(8)

  const [league] = await db
    .insert(leagues)
    .values({ name: parsed.data.name, slug, adminId: user.id })
    .returning()

  await db.insert(leagueMembers).values({ leagueId: league.id, userId: user.id })

  return Response.json(league, { status: 201 })
}
