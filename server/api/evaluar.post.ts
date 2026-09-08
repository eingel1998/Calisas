// POST /api/evaluar — mismo contrato que backend/main.py
import { calcular_evaluacion } from '../utils/calculos'
import { registrar_muestra_db } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const req = await readBody(event)
    const extrasRaw = req.extras ?? {}
    // Filtrar valores null en extras
    const extras = Object.fromEntries(
      Object.entries(extrasRaw).filter(([, v]) => v !== null && v !== undefined)
    )

    const elementos = Array.isArray(req.elementos) ? req.elementos : []
    const evalRes = calcular_evaluacion(
      req.caco3, req.cao, req.mgo, req.sio2, req.fe2o3, req.al2o3, req.so3,
      req.na2o, req.k2o, req.p2o5, req.pb, req.cd, req.as_ppm,
      req.petrografia ?? 'Micrítica de grano fino', true, 0, 0, 0, extras,
      elementos
    )

    const now = new Date()
    const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const fullPayload = {
      id_muestra: req.id_muestra,
      elementos,
      drx: req.drx ?? 'Calcita',
      petrografia: req.petrografia ?? 'Micrítica de grano fino',
      archivo_fuente: req.archivo_fuente ?? 'Manual',
      fecha_registro: fecha,
      extras,
      ...evalRes,
    }

    if (req.guardar_db !== false) {
      await registrar_muestra_db(fullPayload)
    }

    return fullPayload
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Error en el cálculo: ${e.message}` })
  }
})