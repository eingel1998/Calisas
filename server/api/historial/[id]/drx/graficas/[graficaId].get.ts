import { obtener_drx_grafica_db } from '../../../../../utils/db'

// ?original=1 devuelve el archivo tal como se subió (PDF o imagen); por defecto, el PNG.
export default defineEventHandler(async (event) => {
  const g = await obtener_drx_grafica_db(getRouterParam(event, 'id') || '', Number(getRouterParam(event, 'graficaId')), getQuery(event).original === '1')
  setHeader(event, 'Content-Type', g.mime)
  setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(g.nombre)}`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(g.contenido)
})
