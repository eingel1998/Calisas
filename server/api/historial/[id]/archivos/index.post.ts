import { error_db, guardar_archivos_db, TIPOS_ARCHIVO, type TipoArchivo } from '../../../../utils/db'
import { MAX_EVIDENCIA_BYTES, validar_pdf_evidencia } from '../../../../utils/evidencia'

const PNG = [0x89, 0x50, 0x4e, 0x47]

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (Number(getHeader(event, 'content-length')) > 4 * MAX_EVIDENCIA_BYTES) throw error_db(413, 'Los archivos superan el límite de carga')
  const parts = (await readMultipartFormData(event)) || []
  const archivos = []
  for (const p of parts) {
    if (!(p.name && p.name in TIPOS_ARCHIVO)) throw error_db(400, `Tipo de archivo desconocido: ${p.name}`)
    const tipo = p.name as TipoArchivo
    if (p.data.length > MAX_EVIDENCIA_BYTES) throw error_db(413, `${tipo}: supera 10 MiB`)
    if (TIPOS_ARCHIVO[tipo] === 'image/png') { if (!PNG.every((b, i) => p.data[i] === b)) throw error_db(400, `${tipo}: PNG inválido`) }
    else await validar_pdf_evidencia(p.data)
    archivos.push({ tipo, nombre: (p.filename || tipo).slice(0, 200), contenido: new Uint8Array(p.data) })
  }
  if (!archivos.length) throw error_db(400, 'No se recibieron archivos')
  await guardar_archivos_db(id, archivos)
  return { status: 'ok', guardados: archivos.map(a => a.tipo) }
})
