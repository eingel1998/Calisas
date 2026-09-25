import { error_db, guardar_drx_db } from '../../../../utils/db'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || !Array.isArray(body.fases) || body.fases.length > 30) throw error_db(400, 'Fases DRX inválidas')
  for (const campo of ['laboratorio', 'fecha_ensayo', 'observaciones']) if (typeof body[campo] !== 'string' || body[campo].length > (campo === 'observaciones' ? 2000 : 200)) throw error_db(400, `${campo}: valor inválido`)
  if (body.fecha_ensayo && !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha_ensayo)) throw error_db(400, 'Fecha de ensayo inválida')
  const minerales = new Set<string>()
  let suma = 0
  const fases = body.fases.map((fase: any) => {
    if (!fase || typeof fase.mineral !== 'string' || !fase.mineral.trim() || fase.mineral.length > 100) throw error_db(400, 'Nombre mineral inválido')
    const mineral = fase.mineral.trim()
    if (minerales.has(mineral.toLowerCase())) throw error_db(400, 'Fase mineral repetida')
    minerales.add(mineral.toLowerCase())
    const porcentaje = fase.porcentaje === '' || fase.porcentaje == null ? null : Number(fase.porcentaje)
    if (porcentaje !== null && (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100)) throw error_db(400, 'Porcentaje DRX inválido')
    suma += porcentaje || 0
    return { mineral, porcentaje }
  })
  if (suma > 100.000001) throw error_db(400, 'Los porcentajes DRX superan 100%')
  if (!fases.length) throw error_db(400, 'Agrega al menos una fase identificada')
  await guardar_drx_db(id, { laboratorio: body.laboratorio.trim(), fecha_ensayo: body.fecha_ensayo, observaciones: body.observaciones.trim(), fases })
  return { status: 'ok' }
})
