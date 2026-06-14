import { auth } from '@clerk/nextjs/server'
import { getUserDbRecord } from '@/lib/queries'

export async function GET() {
  const { userId: clerkId } = await auth.protect()
  const user = await getUserDbRecord(clerkId)
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(user)
}
