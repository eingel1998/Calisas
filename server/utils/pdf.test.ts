// Tests dorados: extracción end-to-end (pdfjs → parser) contra reportes
// Panalytical/Omnian REALES. Si el laboratorio cambia el formato del PDF,
// estos tests fallan antes de que un dato corrupto llegue a un dictamen.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extraer_texto_pdf } from './pdf'
import { parsear_reporte_xrf } from './calculos'

const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name))

async function extraerYParsear(name: string) {
  const texto = await extraer_texto_pdf(fixture(name))
  return parsear_reporte_xrf(texto)
}

describe('extracción de reportes XRF reales (Sample results)', () => {
  it('M10: óxidos y trazas exactos', async () => {
    const d = (await extraerYParsear('M10 T.pdf'))!
    expect(d).not.toBeNull()
    expect(d.muestra_id).toBe('M10')
    expect(d.cao).toBe(97.501)
    expect(d.mgo).toBe(0.302)
    expect(d.sio2).toBe(1.476)
    expect(d.al2o3).toBe(0.333)
    expect(d.fe2o3).toBe(0.198)
    expect(d.k2o).toBe(0.131)
    expect(d.pb).toBe(23.8)
    expect(d.as_ppm).toBe(0.0)
  })

  it('M9: valores clave', async () => {
    const d = (await extraerYParsear('M9 T.pdf'))!
    expect(d.muestra_id).toBe('M9')
    expect(d.cao).toBe(94.583)
    expect(d.sio2).toBe(3.801)
    expect(d.pb).toBe(6.9)
    expect(d.as_ppm).toBe(0.6)
  })

  it('M8: valores clave', async () => {
    const d = (await extraerYParsear('M8 T.pdf'))!
    expect(d.muestra_id).toBe('M8')
    expect(d.cao).toBe(92.576)
    expect(d.fe2o3).toBe(0.826)
    expect(d.as_ppm).toBe(3.7)
  })

  it('M7: valores clave', async () => {
    const d = (await extraerYParsear('M7 T.pdf'))!
    expect(d.muestra_id).toBe('M7')
    expect(d.cao).toBe(95.843)
    expect(d.mgo).toBe(0.314)
    expect(d.pb).toBe(3.0)
  })

  it('analitos ausentes en el reporte quedan null, no 0', async () => {
    const d = (await extraerYParsear('M10 T.pdf'))!
    expect(d.cd).toBeNull()
    expect(d.so3).toBeNull()
    expect(d.na2o).toBeNull()
    expect(d.p2o5).toBeNull()
    // los presentes sí traen valor numérico
    expect(d.pb).not.toBeNull()
  })

  it('captura los 21 compuestos del reporte, no solo los evaluados', async () => {
    const d = (await extraerYParsear('M10 T.pdf'))!
    expect(d.elementos).toHaveLength(21)
    const porNombre = Object.fromEntries(d.elementos.map((e) => [e.nombre, e]))
    // compuestos sin criterio normativo: deben quedar registrados igual
    expect(porNombre['Zn']).toEqual({ nombre: 'Zn', conc: 67.6, unidad: 'ppm' })
    expect(porNombre['Sn']).toEqual({ nombre: 'Sn', conc: 115.9, unidad: 'ppm' })
    expect(porNombre['Cr'].conc).toBe(15.6)
    expect(porNombre['Mn'].conc).toBe(175.4)
    // y los evaluados conservan su valor crudo, sin conversión
    expect(porNombre['CaO']).toEqual({ nombre: 'CaO', conc: 97.501, unidad: '%' })
  })

  it('PDF de espectro (sin tabla) es rechazado con null', async () => {
    const d = await extraerYParsear('M10 E.pdf')
    expect(d).toBeNull()
  })
})

// Puente visión→parser: el JSON del modelo de visión se sintetiza a texto de
// reporte y debe producir el mismo DatosXRF que el PDF nativo.
import { tabla_json_a_texto } from './llm'

describe('tabla de imagen (visión) → parser', () => {
  it('JSON válido produce los mismos valores que el PDF', () => {
    const texto = tabla_json_a_texto({
      muestra_id: 'M10',
      compuestos: [
        { nombre: 'MgO', conc: 0.302, unidad: '%' },
        { nombre: 'CaO', conc: 97.501, unidad: '%' },
        { nombre: 'SiO2', conc: 1.476, unidad: '%' },
        { nombre: 'Pb', conc: 23.8, unidad: 'ppm' },
      ],
    })!
    const d = parsear_reporte_xrf(texto)!
    expect(d.muestra_id).toBe('M10')
    expect(d.cao).toBe(97.501)
    expect(d.pb).toBe(23.8)
    expect(d.cd).toBeNull()
  })

  it('filas corruptas se descartan y sin filas válidas retorna null', () => {
    expect(tabla_json_a_texto({ compuestos: [{ nombre: 'CaO', conc: Number.NaN, unidad: '%' }] })).toBeNull()
    expect(tabla_json_a_texto({ error: 'sin_tabla', compuestos: [] })).toBeNull()
  })
})

// Markdown real devuelto por DeepSeek-OCR sobre el reporte M10 (prueba ollama
// del usuario): el normalizador debe dejarlo legible para el parser.
import { normalizar_markdown_ocr } from './llm'

describe('markdown de DeepSeek-OCR → parser', () => {
  const MD = `Page 1

Sample ident

M10

Application | <Omnian>
Sequence | 1 of 1

| Compound | MgO | Al2O3 | SiO2 | Cl | K2O | CaO | Ti | V | Cr | Mn | Fe2O3 | Zn | As |
|----------|-----|-------|------|----|-----|-----|-----|----|----|----|--------|----|----|
| Conc    | 0,302 | 0,333 | 1,476 | 0,0 | 0,131 | 97,501 | 95,3 | 26,5 | 15,6 | 175,4 | 0,198 | 67,6 | 0,0 |
| Unit    | %     | %     | %     | ppm | %    | %    | ppm | ppm | ppm | ppm | %    | ppm | ppm |

| Compound | Zr   | Sn   | Sm   | Pb   | Eu   | Yb   | Lu   | Re   |
|----------|------|------|------|------|------|------|------|------|
| Conc    | 42,9 | 115,9| 9,8  | 23,8 | 0,0  | 13,0 | 4,1  | 0,0  |
| Unit    | ppm  | ppm  | ppm  | ppm  | ppm  | ppm  | ppm  | ppm  |`

  it('valores exactos del reporte M10', () => {
    const d = parsear_reporte_xrf(normalizar_markdown_ocr(MD))!
    expect(d).not.toBeNull()
    expect(d.muestra_id).toBe('M10')
    expect(d.cao).toBe(97.501)
    expect(d.fe2o3).toBe(0.198)
    expect(d.sio2).toBe(1.476)
    expect(d.pb).toBe(23.8)
    expect(d.cd).toBeNull()
    expect(d.so3).toBeNull()
  })
})
