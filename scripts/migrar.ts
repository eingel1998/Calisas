// Corre las migraciones antes del build: si fallan, el despliegue se cancela.
import { ensureSchema } from '../server/utils/db'

if (!process.env.TURSO_URL) {
  console.log('[migrar] sin TURSO_URL: se omite (el esquema local se crea al arrancar)')
} else {
  await ensureSchema()
  console.log('[migrar] esquema de Turso verificado')
}
