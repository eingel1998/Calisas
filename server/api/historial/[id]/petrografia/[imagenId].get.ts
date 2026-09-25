import { obtener_imagen_petrografia_db } from '../../../../utils/db'
export default defineEventHandler(async (event) => {
  const row = await obtener_imagen_petrografia_db(getRouterParam(event, 'id') || '', Number(getRouterParam(event, 'imagenId')))
  setHeader(event, 'Content-Type', row.tipo as string)
  setHeader(event, 'Content-Disposition', `inline; filename="${String(row.nombre).replace(/["\\\r\n]/g, '')}"`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(row.contenido as ArrayBuffer)
})
