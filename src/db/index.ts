import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type DB = NeonHttpDatabase<typeof schema> & { $client: ReturnType<typeof neon> }

let _db: DB | undefined

export function getDb(): DB {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    const sql = neon(url)
    _db = drizzle(sql, { schema }) as DB
  }
  return _db
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})
