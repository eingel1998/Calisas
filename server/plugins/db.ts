// Crea el esquema SQLite al arrancar (corrige el bug donde init_db() nunca se llamaba).
import { ensureSchema } from '../utils/db'

export default defineNitroPlugin(async () => {
  await ensureSchema()
})