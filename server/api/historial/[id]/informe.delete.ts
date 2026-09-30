import { ALCANCES, type Alcance, borrar_informe_db, error_db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const alcance = getQuery(event).alcance as Alcance
  if (!ALCANCES.includes(alcance)) throw error_db(400, 'Tipo de informe inválido')
  await borrar_informe_db(getRouterParam(event, 'id') || '', alcance)
  return { status: 'ok' }
})
