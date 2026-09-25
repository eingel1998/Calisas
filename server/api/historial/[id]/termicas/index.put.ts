import { error_db, guardar_analisis_termico_db } from '../../../../utils/db'
import { validar_numero } from '../../../../utils/calculos'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (Number(getHeader(event, 'content-length')) > 16 * 1024) throw error_db(413, 'Solicitud demasiado grande')
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || !['TGA/DTG', 'DSC', 'DTA', 'TGA-DSC'].includes(body.tecnica)) throw error_db(400, 'Técnica térmica inválida')
  const dato: Record<string, string | number | null> = { tecnica: body.tecnica }
  for (const campo of ['laboratorio', 'fecha_ensayo', 'atmosfera', 'observaciones']) {
    const value = body[campo]
    if (typeof value !== 'string' || value.length > (campo === 'observaciones' ? 2000 : 200)) throw error_db(400, `${campo}: valor inválido`)
    dato[campo] = value.trim()
  }
  if (dato.fecha_ensayo && !/^\d{4}-\d{2}-\d{2}$/.test(String(dato.fecha_ensayo))) throw error_db(400, 'Fecha inválida')
  for (const [campo, max] of [['tasa_calentamiento', 1000], ['temperatura_inicio', 3000], ['temperatura_fin', 3000], ['temperatura_evento', 3000], ['perdida_masa', 100]] as const) dato[campo] = validar_numero(body[campo], campo, max)
  if (dato.tasa_calentamiento === 0) throw error_db(400, 'La tasa de calentamiento debe ser mayor que cero')
  const ini = dato.temperatura_inicio as number | null, fin = dato.temperatura_fin as number | null, evento = dato.temperatura_evento as number | null
  if (ini != null && fin != null && ini > fin) throw error_db(400, 'La temperatura inicial supera la final')
  if (evento != null && ((ini != null && evento < ini) || (fin != null && evento > fin))) throw error_db(400, 'La temperatura del evento queda fuera del intervalo medido')
  await guardar_analisis_termico_db(id, dato)
  return { status: 'ok' }
})
