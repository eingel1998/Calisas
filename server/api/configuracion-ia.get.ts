import { admin_config_ia_db, obtener_config_petrografia_db } from '../utils/db'
import { PROMPTS_DEFAULT } from '../utils/informe-integral'

export default defineEventHandler(async (event) => {
  if (!await admin_config_ia_db(event.context.user.id)) throw createError({ statusCode: 403, statusMessage: 'Solo el administrador puede configurar la IA' })
  const { baseURL, model, apiKey, savedKey, prompts, proveedor } = await obtener_config_petrografia_db()
  return { baseURL, model, hasKey: Boolean(apiKey), savedKey, prompts, proveedor, defaults: PROMPTS_DEFAULT }
})
