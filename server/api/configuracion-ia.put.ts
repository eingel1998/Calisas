import { admin_config_ia_db, guardar_config_petrografia_db, obtener_config_petrografia_db } from '../utils/db'
import { isIP } from 'node:net'

export default defineEventHandler(async (event) => {
  if (!await admin_config_ia_db(event.context.user.id)) throw createError({ statusCode: 403, statusMessage: 'Solo el administrador puede configurar la IA' })
  const body = await readBody(event)
  const baseURL = typeof body?.baseURL === 'string' ? body.baseURL.trim() : ''
  const model = typeof body?.model === 'string' ? body.model.trim() : ''
  const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
  let url: URL
  try { url = new URL(baseURL) } catch { throw createError({ statusCode: 400, statusMessage: 'URL del proveedor inválida' }) }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.hostname.includes('.') || isIP(url.hostname) || /\.(local|internal)$/i.test(url.hostname) || baseURL.length > 300) {
    throw createError({ statusCode: 400, statusMessage: 'Usa una URL HTTPS pública del proveedor, sin credenciales ni parámetros' })
  }
  if (!model || model.length > 150 || /\s/.test(model)) throw createError({ statusCode: 400, statusMessage: 'Modelo inválido' })
  if (apiKey.length > 512) throw createError({ statusCode: 400, statusMessage: 'Clave demasiado larga' })
  await guardar_config_petrografia_db(baseURL.replace(/\/$/, ''), model, apiKey)
  const config = await obtener_config_petrografia_db()
  return { baseURL: config.baseURL, model: config.model, hasKey: Boolean(config.apiKey), savedKey: config.savedKey }
})
