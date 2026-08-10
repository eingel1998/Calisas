// GET /api/historial — mismo contrato que backend/main.py
import { obtener_muestras_db } from '../utils/db'

export default defineEventHandler(async () => {
  try {
    return await obtener_muestras_db()
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Error leyendo historial: ${e.message}` })
  }
})