import { error_db, guardar_drx_graficas_db, MAX_GRAFICAS_DRX } from '../../../../../utils/db'
import { MAX_EVIDENCIA_BYTES, validar_pdf_evidencia } from '../../../../../utils/evidencia'

const empieza = (b: Uint8Array, firma: number[]) => firma.every((x, i) => b[i] === x)
const esPng = (b: Uint8Array) => empieza(b, [0x89, 0x50, 0x4e, 0x47])
const mimeImagen = (b: Uint8Array) => esPng(b) ? 'image/png' : empieza(b, [0xff, 0xd8, 0xff]) ? 'image/jpeg'
  : Buffer.from(b.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(b.subarray(8, 12)).toString() === 'WEBP' ? 'image/webp' : null

// Partes por gráfica i: png_i (lo que ve el modelo), original_i (PDF o imagen subida) y nombre_i.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  if (Number(getHeader(event, 'content-length')) > MAX_GRAFICAS_DRX * 2 * MAX_EVIDENCIA_BYTES) throw error_db(413, 'Las gráficas superan el límite de carga')
  const parts = (await readMultipartFormData(event)) || []
  const parte = (nombre: string) => parts.find(p => p.name === nombre)
  const graficas = []
  for (let i = 0; parte(`png_${i}`); i++) {
    if (i >= MAX_GRAFICAS_DRX) throw error_db(400, `Máximo ${MAX_GRAFICAS_DRX} gráficas DRX`)
    const png = new Uint8Array(parte(`png_${i}`)!.data)
    if (!esPng(png) || png.length > MAX_EVIDENCIA_BYTES) throw error_db(400, `Gráfica ${i + 1}: imagen inválida o mayor a 10 MiB`)
    const orig = parte(`original_${i}`)?.data
    let original_mime: string | null = null
    if (orig) {
      if (orig.length > MAX_EVIDENCIA_BYTES) throw error_db(413, `Gráfica ${i + 1}: el archivo original supera 10 MiB`)
      original_mime = Buffer.from(orig.subarray(0, 5)).toString() === '%PDF-' ? 'application/pdf' : mimeImagen(orig)
      if (!original_mime) throw error_db(400, `Gráfica ${i + 1}: el original debe ser PDF, PNG, JPG o WEBP`)
      if (original_mime === 'application/pdf') await validar_pdf_evidencia(orig)
    }
    graficas.push({ nombre: (parte(`nombre_${i}`)?.data.toString() || `grafica-${i + 1}`).slice(0, 200), png, original: orig ? new Uint8Array(orig) : null, original_mime })
  }
  if (!graficas.length) throw error_db(400, 'Sube al menos una gráfica DRX')
  await guardar_drx_graficas_db(id, graficas)
  return { status: 'ok', guardadas: graficas.length }
})
