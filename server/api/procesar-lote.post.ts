// POST /api/procesar-lote — mismo contrato que backend/main.py (con normalización de columnas corregida)
import { parsear_lote } from '../utils/lote'
import { calcular_evaluacion } from '../utils/calculos'
import { registrar_muestra_db } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    const file = form?.find((p) => p.name === 'file')
    if (!file?.data || !file.filename) {
      throw createError({ statusCode: 400, statusMessage: 'No se encontró el archivo en el request.' })
    }

    const filename = file.filename
    const filas = await parsear_lote(file.data, filename)

    const ahora = new Date()
    const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')} ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

    const num = (v: unknown): number => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0.0
    }
    const str = (v: unknown, dflt: string): string => {
      if (v === null || v === undefined || v === '') return dflt
      return String(v).trim()
    }

    const muestrasProcesadas = []

    for (const row of filas) {
      const idRaw = row['IDMUESTRA']
      if (idRaw === null || idRaw === undefined || String(idRaw).trim() === '') continue

      const id_muestra = String(idRaw).trim()
      const evalRes = calcular_evaluacion(
        num(row['CACO3']), num(row['CAO']), num(row['MGO']), num(row['SIO2']),
        num(row['FE2O3']), num(row['AL2O3']), num(row['SO3']),
        num(row['NA2O']), num(row['K2O']), num(row['P2O5']), num(row['PB']), num(row['CD']),
        num(row['AS']),
        str(row['PETROGRAFIA'], 'Micrítica de grano fino'), true, 0, 0, 0, {}
      )

      const fullPayload = {
        id_muestra,
        drx: str(row['DRX'], 'Calcita'),
        petrografia: str(row['PETROGRAFIA'], 'Micrítica de grano fino'),
        archivo_fuente: filename,
        fecha_registro: fecha,
        extras: {},
        ...evalRes,
      }

      await registrar_muestra_db(fullPayload)
      muestrasProcesadas.push(fullPayload)
    }

    return { status: 'ok', count: muestrasProcesadas.length, muestras: muestrasProcesadas }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 500, statusMessage: `Error procesando lote: ${e.message}` })
  }
})