// Auth con Better Auth + adaptador Kysely sobre la MISMA BD que db.ts
// (mismo TURSO_URL/TURSO_TOKEN, mismo fallback a file:./calizas.db).
import { betterAuth } from 'better-auth'
import { Kysely } from 'kysely'
import { LibsqlDialect } from '@libsql/kysely-libsql'
import { resolve } from 'node:path'

const url = process.env.TURSO_URL || `file:${resolve(process.cwd(), 'calizas.db')}`
const authToken = process.env.TURSO_TOKEN || undefined

const dialect = new LibsqlDialect({ url, authToken })

export const auth = betterAuth({
  database: {
    db: new Kysely({ dialect }),
    type: 'sqlite',
  },
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
})
