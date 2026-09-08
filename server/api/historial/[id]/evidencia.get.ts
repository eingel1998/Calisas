import { obtener_evidencia_db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  let id = getRouterParam(event, 'id') ?? ''
  try { id = decodeURIComponent(id) } catch {}
  const evidencia = await obtener_evidencia_db(id)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="evidencia.pdf"; filename*=UTF-8''${encodeURIComponent(String(evidencia.nombre)).replace(/'/g, '%27')}`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(evidencia.contenido as ArrayBuffer)
})
