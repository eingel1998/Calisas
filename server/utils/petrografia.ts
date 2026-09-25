import { error_db } from './db'

export const MAX_IMAGENES = 4
export const MAX_IMAGEN_BYTES = 8 * 1024 * 1024

export function validar_imagenes(parts: Array<{ filename?: string; data: Uint8Array; condicion: string }>) {
  if (!parts.length || parts.length > MAX_IMAGENES) throw error_db(400, 'Selecciona de 1 a 4 imágenes de lámina delgada')
  return parts.map((part) => {
    const b = part.data
    if (!b.length || b.length > MAX_IMAGEN_BYTES) throw error_db(413, 'Cada imagen debe medir hasta 8 MiB')
    const tipo = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'image/jpeg'
      : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? 'image/png'
      : Buffer.from(b.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(b.subarray(8, 12)).toString() === 'WEBP' ? 'image/webp' : null
    if (!tipo) throw error_db(400, 'Solo se admiten imágenes JPEG, PNG o WEBP válidas')
    if (!['LP/PPL', 'NX/XPL', 'Desconocida'].includes(part.condicion)) throw error_db(400, 'Condición óptica inválida')
    return { nombre: (part.filename || 'imagen').split(/[\\/]/).pop()!.replace(/[\r\n\x00-\x1f]/g, '').slice(0, 255), condicion: part.condicion, tipo, contenido: b }
  })
}

export function validar_datos_petrografia(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw error_db(400, 'Datos petrográficos inválidos')
  const permitidos = ['localizacion', 'unidad', 'coordenadas', 'tipo_muestra', 'aumento', 'escala', 'objetivo']
  const datos: Record<string, string> = {}
  for (const key of permitidos) {
    const text = (value as Record<string, unknown>)[key]
    if (text != null && (typeof text !== 'string' || text.length > 500)) throw error_db(400, `${key}: valor inválido`)
    datos[key] = typeof text === 'string' ? text.trim() : ''
  }
  return datos
}
