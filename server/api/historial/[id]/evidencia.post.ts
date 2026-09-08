import { guardar_evidencia_db } from '../../../utils/db'
import { MAX_EVIDENCIA_BYTES, validar_pdf_evidencia } from '../../../utils/evidencia'

export default defineEventHandler(async (event) => {
  // El margen admite las cabeceras multipart; el archivo se valida por su tamaño real.
  const length = Number(getHeader(event, 'content-length'))
  if (length > MAX_EVIDENCIA_BYTES + 64 * 1024) throw createError({ statusCode: 413, statusMessage: 'El PDF supera 10 MiB' })
  let id = getRouterParam(event, 'id') ?? ''
  try { id = decodeURIComponent(id) } catch {}
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')
  const confirmed = parts?.find(p => p.name === 'confirmacion')?.data.toString() === 'true'
  const reemplazar = parts?.find(p => p.name === 'reemplazar')?.data.toString() === 'true'
  if (!file || !confirmed) throw createError({ statusCode: 400, statusMessage: 'Selecciona un PDF y confirma que corresponde a la muestra' })
  await validar_pdf_evidencia(file.data)
  const nombre = (file.filename || 'evidencia.pdf').split(/[\\/]/).pop()!.replace(/[\r\n\x00-\x1f]/g, '').slice(0, 255) || 'evidencia.pdf'
  await guardar_evidencia_db(id, nombre, file.data, reemplazar)
  return { status: 'ok', nombre }
})
