import { obtener_archivo_db } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const archivo = await obtener_archivo_db(getRouterParam(event, 'id') || '', Number(getRouterParam(event, 'archivoId')))
  setHeader(event, 'Content-Type', String(archivo.mime))
  setHeader(event, 'Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(String(archivo.nombre))}`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return Buffer.from(archivo.contenido as ArrayBuffer)
})
