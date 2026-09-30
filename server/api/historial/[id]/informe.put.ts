import { ALCANCES, type Alcance, error_db, guardar_informe_db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const alcance = (body?.alcance || 'integral') as Alcance
  if (!ALCANCES.includes(alcance)) throw error_db(400, 'Tipo de informe inválido')
  if (typeof body?.informe !== 'string' || body.informe.length > 100_000) throw error_db(400, 'Informe inválido')
  if (!['borrador', 'revisado'].includes(body.estado)) throw error_db(400, 'Estado inválido')
  await guardar_informe_db(id, alcance, body.informe, body.estado, null)
  return { status: 'ok' }
})
