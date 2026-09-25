import { expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluar_muestra } from './calculos'
import { actualizar_muestra_db, borrar_muestra_db, ensureSchema, guardar_analisis_termico_db, guardar_drx_db, obtener_analisis_termico_db, obtener_drx_db, obtener_muestras_db, registrar_muestra_db } from './db'

it('recalcula una muestra guardada y conserva DRX al editarla', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'calizas-edit-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    const original = evaluar_muestra({ id_muestra: 'M1', coordenadas_muestreo: '4.5, -74.1 WGS84', direccion_muestreo: 'Cantera, frente norte', caco3: 90, cao: 50, mgo: 1, sio2: 3, fe2o3: 1, contexto: { base: 'seca' } })
    await registrar_muestra_db(original, db)
    await guardar_drx_db('M1', { laboratorio: 'Laboratorio', fecha_ensayo: '2026-09-25', observaciones: '', fases: [{ mineral: 'Calcita', porcentaje: 90 }] }, db)
    await guardar_analisis_termico_db('M1', { tecnica: 'TGA/DTG', laboratorio: 'Laboratorio', fecha_ensayo: '2026-09-25', atmosfera: 'aire', tasa_calentamiento: 10, temperatura_inicio: 20, temperatura_fin: 900, temperatura_evento: 750, perdida_masa: 40, observaciones: 'Evento endotérmico' }, db)
    const actualizado = evaluar_muestra({ id_muestra: 'M1', coordenadas_muestreo: '4.5, -74.1 WGS84', direccion_muestreo: 'Cantera, frente sur', caco3: 96, cao: 54, mgo: 1, sio2: 3, fe2o3: 1, contexto: { base: 'seca' } })
    await actualizar_muestra_db('M1', actualizado, null, db)
    const [muestra] = await obtener_muestras_db(db)
    expect(muestra.caco3).toBe(96)
    expect(muestra.coordenadas_muestreo).toBe('4.5, -74.1 WGS84')
    expect(muestra.direccion_muestreo).toBe('Cantera, frente sur')
    expect(muestra.contexto.entrada.caco3).toBe(96)
    expect(muestra.fecha_modificacion).toBeTruthy()
    expect(muestra.dictamenes).toEqual(actualizado.dictamenes)
    const calcinada = evaluar_muestra({ id_muestra: 'M1', cao: 96, mgo: 1, contexto: { base: 'calcinada', base_trazas: 'calcinada', convertir: true, estimar_loi: false, loi: 43 } })
    const recalculada = evaluar_muestra({ id_muestra: 'M1', ...calcinada.contexto.entrada, contexto: { base: calcinada.contexto.base, base_trazas: calcinada.contexto.base_trazas, convertir: true, estimar_loi: false, loi: 43 } })
    expect(recalculada.cao).toBe(calcinada.cao)
    await expect(actualizar_muestra_db('M1', original, null, db)).rejects.toMatchObject({ statusCode: 409 })
    expect((await obtener_drx_db('M1', db)).fases).toMatchObject([{ mineral: 'Calcita', porcentaje: 90 }])
    expect(await obtener_analisis_termico_db('M1', db)).toMatchObject({ tecnica: 'TGA/DTG', temperatura_evento: 750, perdida_masa: 40 })
    await borrar_muestra_db('M1', db)
    await expect(obtener_drx_db('M1', db)).rejects.toMatchObject({ statusCode: 404 })
    await expect(obtener_analisis_termico_db('M1', db)).rejects.toMatchObject({ statusCode: 404 })
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})
