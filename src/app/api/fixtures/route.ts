import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { fixtures } from '@/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  await auth.protect()

  const all = await db.select().from(fixtures).orderBy(asc(fixtures.kickoffAt))
  return Response.json(all)
}
