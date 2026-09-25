import { guardar_petrografia_db, obtener_petrografia_db, error_db } from '../../../../utils/db'
import { validar_datos_petrografia, validar_imagenes } from '../../../../utils/petrografia'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  await obtener_petrografia_db(id)
  const length = Number(getHeader(event, 'content-length'))
  if (length > 33 * 1024 * 1024) throw error_db(413, 'Carga demasiado grande')
  const parts = await readMultipartFormData(event)
  const informe = parts?.find(p => p.name === 'informe')?.data.toString() || ''
  const estado = parts?.find(p => p.name === 'estado')?.data.toString() || 'borrador'
  if (!informe.trim() || informe.length > 100_000) throw error_db(400, 'Informe vacío o demasiado largo')
  if (!['borrador', 'revisado'].includes(estado)) throw error_db(400, 'Estado inválido')
  let raw: unknown
  try { raw = JSON.parse(parts?.find(p => p.name === 'datos')?.data.toString() || '{}') } catch { throw error_db(400, 'Datos inválidos') }
  const datos = validar_datos_petrografia(raw)
  const imagenes = (parts || []).filter(p => p.name === 'imagen')
  const validadas = imagenes.length ? validar_imagenes(imagenes.map((p, i) => ({ filename: p.filename, data: p.data, condicion: parts?.find(x => x.name === `condicion_${i}`)?.data.toString() || 'Desconocida' }))) : []
  const modelo = parts?.find(p => p.name === 'modelo')?.data.toString().slice(0, 100) || null
  await guardar_petrografia_db(id, informe.trim(), estado, datos, modelo, validadas)
  return { status: 'ok' }
})
