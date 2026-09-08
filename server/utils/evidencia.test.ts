import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SCHEMA_SQL, ensureSchema, registrar_muestra_db, registrar_muestras_db, obtener_muestras_db, guardar_evidencia_db, obtener_evidencia_db, borrar_muestra_db } from './db'
import { validar_pdf_evidencia, MAX_EVIDENCIA_BYTES } from './evidencia'

function pdf() {
  let text = '%PDF-1.4\n'
  const offsets = [0]
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>']
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(text)); text += `${i + 1} 0 obj\n${obj}\nendobj\n` })
  const xref = Buffer.byteLength(text)
  text += `xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(text)
}

let db: Client
let directory: string
beforeEach(async () => { directory = mkdtempSync(join(tmpdir(), 'calizas-test-')); db = createClient({ url: `file:${join(directory, 'test.db')}` }); await ensureSchema(db) })
afterEach(() => { db.close(); rmSync(directory, { recursive: true, force: true }) })

describe('persistencia y evidencia', () => {
  it('migra el esquema anterior sin alterar sus columnas y admite repetición', async () => {
    await db.execute('DROP TABLE muestras')
    await db.execute(SCHEMA_SQL)
    await db.execute("INSERT INTO muestras (id_muestra, loi, dictamenes_json) VALUES ('histórica', 0, 'corrupto')")
    const antes = (await db.execute('SELECT * FROM muestras')).rows[0]!
    await ensureSchema(db); await ensureSchema(db)
    const despues = (await db.execute('SELECT * FROM muestras')).rows[0]!
    for (const key of Object.keys(antes)) expect(despues[key]).toEqual(antes[key])
    const [historica] = await obtener_muestras_db(db)
    expect(historica.dictamenes).toBeNull(); expect(historica.resumen).toBeNull()
    expect(historica.version_evaluacion).toBeNull()
  })

  it('preserva cero, ausencia, precisión y contexto; duplicados revierten todo el lote', async () => {
    const datos = { id_muestra: 'M7', cao: 95.843, loi: 0, cd: null, contexto: { base: 'desconocida' }, version_evaluacion: 2 }
    await registrar_muestra_db(datos, db)
    await expect(registrar_muestras_db([{ id_muestra: 'nuevo' }, datos], db)).rejects.toMatchObject({ statusCode: 409 })
    const rows = await obtener_muestras_db(db)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject(datos)
    expect(rows[0].drx).toBeNull()
    await registrar_muestra_db({ id_muestra: 'loi43', loi: 43 }, db)
    expect((await obtener_muestras_db(db)).find(d => d.id_muestra === 'loi43').loi).toBe(43)
  })

  it('valida contenido, tamaño y un PDF sin texto', async () => {
    await expect(validar_pdf_evidencia(pdf())).resolves.toBeUndefined()
    await expect(validar_pdf_evidencia(Buffer.from('%PDF-roto'))).rejects.toMatchObject({ statusCode: 400 })
    await expect(validar_pdf_evidencia(Buffer.alloc(0))).rejects.toMatchObject({ statusCode: 400 })
    await expect(validar_pdf_evidencia(Buffer.alloc(MAX_EVIDENCIA_BYTES + 1))).rejects.toMatchObject({ statusCode: 413 })
  })

  it('descarga bytes idénticos, exige muestra/reemplazo y elimina evidencia junto a muestra', async () => {
    const bytes = pdf()
    await expect(guardar_evidencia_db('M7', 'E.pdf', bytes, false, db)).rejects.toMatchObject({ statusCode: 404 })
    await registrar_muestra_db({ id_muestra: 'M7', dictamenes: [{ nombre: 'histórico', estado: 'Apto' }] }, db)
    const antes = (await obtener_muestras_db(db))[0].dictamenes
    await guardar_evidencia_db('M7', 'E.pdf', bytes, false, db)
    expect(Buffer.from((await obtener_evidencia_db('M7', db)).contenido as ArrayBuffer)).toEqual(bytes)
    await expect(guardar_evidencia_db('M7', 'otro.pdf', bytes, false, db)).rejects.toMatchObject({ statusCode: 409 })
    await guardar_evidencia_db('M7', 'otro.pdf', bytes, true, db)
    const [sample] = await obtener_muestras_db(db)
    expect(sample.dictamenes).toEqual(antes)
    expect(sample.evidencia.nombre).toBe('otro.pdf')
    expect(sample.contenido).toBeUndefined()
    await borrar_muestra_db('M7', db)
    await expect(obtener_evidencia_db('M7', db)).rejects.toMatchObject({ statusCode: 404 })
  })
})
