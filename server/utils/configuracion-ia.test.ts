import { createClient } from '@libsql/client'
import { afterEach, expect, it } from 'vitest'
import { admin_config_ia_db, ensureSchema, guardar_config_petrografia_db, obtener_config_petrografia_db } from './db'

const previousSecret = process.env.BETTER_AUTH_SECRET
afterEach(() => { process.env.BETTER_AUTH_SECRET = previousSecret })

it('guarda la clave cifrada y aplica cambios sin exponerla', async () => {
  process.env.BETTER_AUTH_SECRET = 'test-secret-for-encryption'
  const db = createClient({ url: ':memory:' })
  try {
    await ensureSchema(db)
    await db.execute('CREATE TABLE "user" (id TEXT PRIMARY KEY, "createdAt" TEXT NOT NULL)')
    await db.execute("INSERT INTO \"user\" VALUES ('owner', '2026-01-01'), ('other', '2026-01-02')")
    expect(await admin_config_ia_db('owner', db)).toBe(true)
    expect(await admin_config_ia_db('other', db)).toBe(false)

    await guardar_config_petrografia_db('https://openrouter.ai/api/v1', 'google/gemma-4-31b-it:free', 'sk-prueba', {}, db)
    const stored = await db.execute('SELECT api_key_enc FROM ai_configuracion')
    expect(String(stored.rows[0].api_key_enc)).not.toContain('sk-prueba')
    expect(await obtener_config_petrografia_db(db)).toMatchObject({ model: 'google/gemma-4-31b-it:free', apiKey: 'sk-prueba', savedKey: true })

    await guardar_config_petrografia_db('https://openrouter.ai/api/v1', 'google/gemma-4-26b-a4b-it:free', '', {}, db)
    expect(await obtener_config_petrografia_db(db)).toMatchObject({ model: 'google/gemma-4-26b-a4b-it:free', apiKey: 'sk-prueba' })
  } finally { db.close() }
})
