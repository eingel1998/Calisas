import { evaluar_muestra } from '../utils/calculos'
import { registrar_muestra_db } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const req = await readBody(event)
    const resultado = evaluar_muestra(req)
    if (req.guardar_db !== false) await registrar_muestra_db(resultado)
    return resultado
  } catch (e: any) {
    throw createError({ statusCode: e.statusCode || 500, statusMessage: e.message || 'Error al evaluar la muestra.' })
  }
})
