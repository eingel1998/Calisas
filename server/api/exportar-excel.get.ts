// GET /api/exportar-excel — mismo contrato que backend/main.py
import { obtener_muestras_db } from '../utils/db'
import { exportar_historial_excel } from '../utils/excel'

export default defineEventHandler(async (event) => {
  try {
    const muestras = await obtener_muestras_db()
    if (!muestras.length) {
      throw createError({ statusCode: 400, statusMessage: 'No hay muestras en el historial para exportar' })
    }

    const buffer = await exportar_historial_excel(muestras)
    setHeader(event, 'Content-Disposition', 'attachment; filename="BaseDatos_Calizas.xlsx"')
    setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return buffer
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 500, statusMessage: `Error exportando Excel: ${e.message}` })
  }
})