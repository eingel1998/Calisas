// DELETE /api/historial/[id] — el id puede venir URL-encoded (encodeURIComponent del frontend).
import { borrar_muestra_db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Nitro NO decodifica router params: el frontend manda encodeURIComponent(id),
    // así que hay que decodificar acá (p.ej. "M10%2F2" → "M10/2").
    let id = getRouterParam(event, 'id') ?? ''
    try {
      id = decodeURIComponent(id)
    } catch {
      // id ya legible; ignorar
    }
    await borrar_muestra_db(id)
    return { status: 'ok', message: `Muestra ${id} eliminada` }
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Error eliminando muestra: ${e.message}` })
  }
})