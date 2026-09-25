import { actualizar_muestra_db, error_db, obtener_muestras_db } from '../../utils/db'
import { evaluar_muestra } from '../../utils/calculos'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const length = Number(getHeader(event, 'content-length'))
  if (length > 2 * 1024 * 1024) throw error_db(413, 'Solicitud demasiado grande')
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || !body.datos || typeof body.datos !== 'object') throw error_db(400, 'Datos inválidos')
  const actual = (await obtener_muestras_db()).find(m => m.id_muestra === id)
  if (!actual) throw error_db(404, 'La muestra no existe')
  if (actual.version_evaluacion !== 2) throw error_db(409, 'Este registro histórico no tiene entradas originales verificables para recalcularse')
  const resultado = evaluar_muestra({ ...body.datos, id_muestra: id, archivo_fuente: actual.archivo_fuente })
  await actualizar_muestra_db(id, resultado, body.fecha_modificacion ?? null)
  return { status: 'ok' }
})
