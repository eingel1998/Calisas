// Parseo de lotes (CSV/XLSX/XLS) con normalización de columnas corregida:
// NFD strip de acentos (PETROGRAFÍA → PETROGRAFIA) + uppercase + sin espacios + sin (%) + sin DELA/DE.
import ExcelJS from 'exceljs'

export function normalizeCol(c: string): string {
  return c
    .replace(/[₀-₉]/g, n => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(n)))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip acentos: PETROGRAFÍA → PETROGRAFIA
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\((?:%|ppm|µm|MPa)\)/gi, '')
    .replace('DELA', '')
    .replace('DE', '')
}

function csvSplit(linea: string, sep: string): string[] {
  // split simple con soporte de comillas dobles
  const out: string[] = []
  let cur = ''
  let q = false
  for (const ch of linea) {
    if (ch === '"') { q = !q; continue }
    if (ch === sep && !q) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

function detectarSeparador(header: string): string {
  const c = (header.match(/,/g) || []).length
  const p = (header.match(/;/g) || []).length
  return p > c ? ';' : ','
}

export async function parsear_lote(buffer: Buffer, filename: string): Promise<Record<string, any>[]> {
  const ext = filename.toLowerCase().split('.').pop() || ''

  if (ext === 'csv') {
    const texto = buffer.toString('utf-8').replace(/^\uFEFF/, '')
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (lineas.length === 0) return []
    const sep = detectarSeparador(lineas[0])
    const headers = csvSplit(lineas[0], sep).map((h) => normalizeCol(h))
    if (!headers.includes('IDMUESTRA')) throw Object.assign(new Error('Falta la columna ID Muestra.'), { statusCode: 400 })
    if (new Set(headers).size !== headers.length) throw Object.assign(new Error('Hay columnas duplicadas.'), { statusCode: 400 })
    return lineas.slice(1).map((l) => {
      const vals = csvSplit(l, sep)
      if (vals.length !== headers.length) throw Object.assign(new Error('Una fila no coincide con el número de columnas.'), { statusCode: 400 })
      const row: Record<string, any> = {}
      headers.forEach((h, i) => { row[h] = vals[i] !== undefined ? vals[i].trim() : '' })
      return row
    })
  }

  if (ext !== 'xlsx') throw Object.assign(new Error('Formato no compatible. Use CSV o XLSX.'), { statusCode: 400 })
  // ExcelJS lee OOXML, no el formato binario XLS.
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws || ws.rowCount === 0) return []

  const headers = (ws.getRow(1).values as any[]).slice(1).map((h) => normalizeCol(String(h ?? '')))
  if (!headers.includes('IDMUESTRA')) throw Object.assign(new Error('Falta la columna ID Muestra.'), { statusCode: 400 })
  if (new Set(headers).size !== headers.length) throw Object.assign(new Error('Hay columnas duplicadas.'), { statusCode: 400 })
  const filas: Record<string, any>[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const vals = (row.values as any[]).slice(1)
    const r: Record<string, any> = {}
    headers.forEach((h, i) => { r[h] = vals[i] !== undefined ? vals[i] : '' })
    filas.push(r)
  })
  return filas
}