import { expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluar_muestra } from './calculos'
import { borrar_informe_db, borrar_muestra_db, ensureSchema, guardar_drx_graficas_db, listar_drx_graficas_db, obtener_drx_pngs_db, obtener_muestras_db, guardar_informe_db, obtener_informes_db, obtener_petrografia_db, guardar_archivos_db, listar_archivos_db, obtener_imagenes_frx_db, registrar_muestra_db } from './db'
import { mensaje_informe, PROMPTS_DEFAULT, system_prompt_informe, tarea_informe } from './informe-integral'

it('anida DRX y FRX dentro de la petrografía e incluye solo los análisis presentes', () => {
  const solo_frx = system_prompt_informe('integral', {}, {})
  expect(solo_frx).toContain('# Caracterización petrográfica')
  expect(solo_frx).toContain('No hay secciones delgadas')
  expect(solo_frx).toContain('## Criterios de apoyo: geoquímica (FRX)')
  expect(solo_frx).not.toContain('## Criterios de apoyo: difracción')
  expect(solo_frx).not.toContain('# Propiedades termofísicas')

  const completo = system_prompt_informe('integral', { drx: 'MI PROMPT DRX' }, { drx: true, petrografia: true, termicas: true })
  expect(completo).toContain('MI PROMPT DRX')
  expect(completo).not.toContain('No hay secciones delgadas')
  expect(completo.indexOf('# Caracterización petrográfica')).toBeLessThan(completo.indexOf('## Criterios de apoyo: difracción'))
  expect(completo).toContain(PROMPTS_DEFAULT.termicas)
})

it('guarda los archivos FRX por tipo, reemplaza el mismo tipo y los borra con la muestra', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'calizas-archivos-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    await registrar_muestra_db(evaluar_muestra({ id_muestra: 'M7', cao: 95.8, mgo: 0.3, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } }), db)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1])
    await guardar_archivos_db('M7', [{ tipo: 'frx_tabla_png', nombre: 'M7 T.png', contenido: png }, { tipo: 'frx_espectro_png', nombre: 'M7 E.png', contenido: png }], db)
    await guardar_archivos_db('M7', [{ tipo: 'frx_tabla_png', nombre: 'M7 T v2.png', contenido: png }], db)
    const lista = await listar_archivos_db('M7', db)
    expect(lista).toHaveLength(2)
    expect(lista.find(a => a.tipo === 'frx_tabla_png')?.nombre).toBe('M7 T v2.png')
    expect((await obtener_imagenes_frx_db('M7', db)).map(i => i.tipo)).toEqual(['frx_tabla_png', 'frx_espectro_png'])
    await expect(guardar_archivos_db('NO', [{ tipo: 'frx_tabla_png', nombre: 'x', contenido: png }], db)).rejects.toMatchObject({ statusCode: 404 })
    expect((await obtener_muestras_db(db, 'M7'))[0]).toMatchObject({ tiene_drx: false, tiene_petrografia: false, tiene_termicas: false, informe_integral_estado: null })
    await guardar_drx_graficas_db('M7', [{ nombre: 'drx.png', png }], db)
    await guardar_informe_db('M7', 'integral', 'x', 'revisado', null, db)
    expect((await obtener_muestras_db(db, 'M7'))[0]).toMatchObject({ tiene_drx: true, informe_integral_estado: 'revisado' })
    await borrar_muestra_db('M7', db)
    expect(await listar_archivos_db('M7', db)).toHaveLength(0)
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})

it('arma el mensaje con análisis disponibles explícitos, dictámenes compactos y sin inventar faltantes', () => {
  const m: any = evaluar_muestra({ id_muestra: 'M7', cao: 95.843, mgo: 0.314, sio2: 2.266, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } } as any)
  const msg = mensaje_informe('integral', m, { drx: null, termicas: null, petrografia: null, imagenes: ['tabla FRX'] })
  expect(msg).toContain('DRX: NO REALIZADO')
  expect(msg).toContain('Propiedades termofísicas: NO REALIZADO')
  expect(msg).not.toContain('<drx>')
  expect(msg).toContain('Na2O | No medido')
  expect(msg).toMatch(/- Producción de cal viva \| (Apto|No Apto|Requiere ensayos) \|/)
  expect(msg).toContain('Imagen 1: tabla FRX')
  expect(msg).not.toContain('texto_reporte')
  expect(tarea_informe('integral')).toContain('## Recomendación')
  expect(system_prompt_informe('integral', {}, {})).not.toContain('## En pocas palabras')
})

it('cada alcance usa su prompt, sus datos y su formato', () => {
  const m: any = evaluar_muestra({ id_muestra: 'M7', cao: 95.843, mgo: 0.314, sio2: 2.266, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } } as any)
  const ev = { drx: { fases: [{ mineral: 'Calcita', porcentaje: 95 }] }, termicas: { conductividad: 0.2447 }, petrografia: { imagenes: ['f1 (LP/PPL)'] }, imagenes: [],
    informes: { petrografia: { informe: 'PETRO VALIDADA', estado: 'revisado' }, frx: { informe: 'FRX BORRADOR', estado: 'borrador' } } }

  const drx = mensaje_informe('drx', m, ev)
  expect(drx).toContain('<drx>')
  expect(drx).not.toContain('<frx>')
  expect(system_prompt_informe('drx', {}, {})).toContain(PROMPTS_DEFAULT.drx)
  expect(system_prompt_informe('drx', {}, {})).not.toContain('Matriz de usos')
  expect(tarea_informe('drx')).toContain('confirmada, probable o tentativa')

  const frx = mensaje_informe('frx', m, ev)
  expect(frx).toContain('<evaluacion_geoquimica>')
  expect(frx).not.toContain('<drx>')

  const integral = mensaje_informe('integral', m, ev)
  expect(integral).toContain('PETRO VALIDADA')
  expect(integral).not.toContain('FRX BORRADOR')
  expect(system_prompt_informe('integral', { mercado: 'Cal viva USD 130/t' }, {})).toContain('# Criterios del análisis de mercado\nCal viva USD 130/t')
  expect(system_prompt_informe('integral', {}, {})).toContain(PROMPTS_DEFAULT.mercado)
  expect(system_prompt_informe('frx', {}, {})).not.toContain('análisis de mercado')
  expect(system_prompt_informe('integral', {}, {})).toContain('Alto valor: farmacéutica')
})

it('guarda informes por alcance; el de petrografía es el mismo del módulo y el integral viejo se migra', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'calizas-informes-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    await registrar_muestra_db(evaluar_muestra({ id_muestra: 'M7', cao: 95.8, mgo: 0.3, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } }), db)
    await db.execute("UPDATE muestras SET informe_integral = 'VIEJO', informe_estado = 'revisado' WHERE id_muestra = 'M7'")
    await ensureSchema(db)
    await guardar_informe_db('M7', 'frx', 'Informe FRX', 'borrador', 'modelo-x', db)
    await guardar_informe_db('M7', 'petrografia', 'Informe petro', 'revisado', 'modelo-y', db)
    await guardar_informe_db('M7', 'frx', 'Informe FRX editado', 'revisado', null, db)
    const inf = await obtener_informes_db('M7', db)
    expect(inf.integral).toMatchObject({ informe: 'VIEJO', estado: 'revisado' })
    expect(inf.frx).toMatchObject({ informe: 'Informe FRX editado', estado: 'revisado', modelo: 'modelo-x' })
    expect(inf.petrografia).toMatchObject({ informe: 'Informe petro', estado: 'revisado' })
    expect((await obtener_petrografia_db('M7', db)).informe).toBe('Informe petro')
    await expect(guardar_informe_db('NO', 'frx', 'x', 'borrador', null, db)).rejects.toMatchObject({ statusCode: 404 })
    await borrar_informe_db('M7', 'frx', db)
    await borrar_informe_db('M7', 'petrografia', db)
    const restantes = await obtener_informes_db('M7', db)
    expect(restantes.frx).toBeUndefined()
    expect(restantes.petrografia).toBeUndefined()
    expect(restantes.integral).toBeDefined()
    await borrar_muestra_db('M7', db)
    expect(await obtener_informes_db('M7', db)).toEqual({})
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})

it('con búsqueda web agrega instrucciones, ubicación y las secciones de mercado regional', () => {
  const m: any = evaluar_muestra({ id_muestra: 'M7', cao: 95.8, mgo: 0.3, direccion_muestreo: 'Vereda X, Nobsa, Boyacá', coordenadas_muestreo: '5.77, -72.94', contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } } as any)
  expect(system_prompt_informe('integral', {}, {}, { web: true })).toContain('nunca pegues las coordenadas')
  expect(system_prompt_informe('integral', {}, {})).not.toContain('Búsqueda web disponible')
  const tarea = tarea_informe('integral', { web: true })
  expect(tarea.indexOf('## Compradores y mercado en la región')).toBeGreaterThan(tarea.indexOf('## Dónde encaja en el mercado'))
  expect(tarea.indexOf('## Fuentes consultadas')).toBeLessThan(tarea.indexOf('## Recomendación'))
  expect(tarea_informe('frx', { web: true })).not.toContain('Compradores')
  const msg = mensaje_informe('integral', m, { drx: null, termicas: null, petrografia: null, imagenes: [], region: 'Colombia, 200 km' })
  expect(msg).toContain('<ubicacion>')
  expect(msg).toContain('Nobsa, Boyacá')
  expect(msg).toContain('Región de mercado a considerar: Colombia, 200 km')
})

it('borrar una muestra elimina todo lo asociado en cada tabla que tenga id_muestra', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'calizas-borrado-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    await registrar_muestra_db(evaluar_muestra({ id_muestra: 'B1', cao: 95.8, mgo: 0.3, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } }), db)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1])
    await guardar_archivos_db('B1', [{ tipo: 'frx_tabla_pdf', nombre: 't.pdf', contenido: png }], db)
    await guardar_drx_graficas_db('B1', [{ nombre: 'd1.png', png }, { nombre: 'd2.png', png }], db)
    await guardar_informe_db('B1', 'integral', 'x', 'borrador', null, db)
    await db.execute("INSERT INTO petrografia_imagenes (id_muestra, nombre, condicion, tipo, contenido) VALUES ('B1', 'f.png', 'LP/PPL', 'image/png', x'00')")
    await db.execute("INSERT INTO evidencias (id_muestra, nombre, tipo, contenido, fecha) VALUES ('B1', 'e.pdf', 'application/pdf', x'00', 'hoy')")
    await borrar_muestra_db('B1', db)
    const tablas = (await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map(r => String(r.name))
    for (const tabla of tablas) {
      const columnas = (await db.execute(`PRAGMA table_info(${tabla})`)).rows.map(r => r.name)
      if (!columnas.includes('id_muestra')) continue
      const quedan = (await db.execute({ sql: `SELECT count(*) AS n FROM ${tabla} WHERE id_muestra = ?`, args: ['B1'] })).rows[0].n
      expect(Number(quedan), `quedaron filas en ${tabla}`).toBe(0)
    }
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})

it('DRX admite varias gráficas, las reemplaza como conjunto y migra la gráfica única anterior', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'calizas-drx-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    await registrar_muestra_db(evaluar_muestra({ id_muestra: 'D1', cao: 95.8, mgo: 0.3, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } }), db)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1])
    // formato anterior: una sola gráfica en archivos_muestra
    await db.execute({ sql: "INSERT INTO archivos_muestra (id_muestra, tipo, nombre, mime, contenido, fecha) VALUES ('D1', 'drx_png', 'vieja.png', 'image/png', ?, 'hoy'), ('D1', 'drx_pdf', 'vieja.pdf', 'application/pdf', ?, 'hoy')", args: [png, png] })
    await ensureSchema(db)
    expect(await listar_drx_graficas_db('D1', db)).toMatchObject([{ nombre: 'vieja.png', original_mime: 'application/pdf' }])
    expect((await db.execute("SELECT count(*) AS n FROM archivos_muestra WHERE tipo LIKE 'drx%'")).rows[0].n).toBe(0)

    await guardar_drx_graficas_db('D1', [{ nombre: 'a.png', png }, { nombre: 'b.jpg', png, original: png, original_mime: 'image/jpeg' }, { nombre: 'c.pdf', png }], db)
    expect((await listar_drx_graficas_db('D1', db)).map(g => g.nombre)).toEqual(['a.png', 'b.jpg', 'c.pdf'])
    expect(await obtener_drx_pngs_db('D1', db)).toHaveLength(3)
    expect((await obtener_muestras_db(db, 'D1'))[0].tiene_drx).toBe(true)
    await expect(guardar_drx_graficas_db('NO', [{ nombre: 'x', png }], db)).rejects.toMatchObject({ statusCode: 404 })
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})

it('avisa al modelo cuando el LOI es estimado y envía los valores redondeados', () => {
  const m: any = evaluar_muestra({ id_muestra: 'M8', cao: 92.576, mgo: 0.407, sio2: 4.307, al2o3: 1.409, fe2o3: 0.826, k2o: 0.361, pb: 27.4,
    contexto: { base: 'calcinada', base_trazas: 'calcinada', convertir: true, estimar_loi: true, loi: null, texto_reporte: 'Application <Omnian>\nSequence 1 of 1' } } as any)
  const msg = mensaje_informe('frx', m, { drx: null, termicas: null, petrografia: null, imagenes: [] })
  expect(msg).toContain('el LOI NO fue medido')
  expect(msg).toContain('programa Omnian (semicuantitativo sin patrones)')
  // ≥1 con 2 decimales; <1 con 3 cifras significativas (0.235), nunca 95.454 ni 0.23513
  expect(msg).not.toMatch(/\b[1-9]\d*\.\d{3,}/)
  expect(msg).not.toMatch(/\b0\.\d{4,}/)
  expect(tarea_informe('frx')).not.toContain('## Valores a tomar con cautela')
  expect(tarea_informe('frx')).toContain('no dediques un apartado aparte')
  expect(system_prompt_informe('frx', {}, {})).toContain('Sn L con Ca Kα')
})

it('el FRX lleva el criterio físico de excitación y títulos cortos con las guías aparte', () => {
  expect(system_prompt_informe('frx', {}, {})).toContain('borde de absorción K')
  const tarea = tarea_informe('frx')
  expect(tarea).toContain('## Para qué podría servir\n')
  expect(tarea).toContain('no copies este texto en los encabezados')
  expect(tarea).toMatch(/- «Para qué podría servir»: síntesis orientativa/)
  for (const a of ['integral', 'frx', 'drx', 'petrografia', 'termicas'] as const) expect(tarea_informe(a)).not.toMatch(/## \d/)
})

it('el DRX lleva criterios fijos de lectura de gráficas y no pide contrastar con FRX', () => {
  const sys = system_prompt_informe('drx', {}, {})
  expect(sys).toContain('±0,1–0,2°')
  expect(sys).toContain('escala del patrón superpuesto')
  expect(sys).toContain('no asignes usos')
  expect(sys).toContain('«no detectado», nunca «nulo»')
  expect(sys).toContain('No infieras historia diagenética')
  expect(sys).toContain('Identidad de la muestra')
  expect(tarea_informe('drx')).not.toContain('## Relación con la química')
})

it('los informes por análisis son independientes: solo su fuente; el integral es el único que relaciona', () => {
  const m: any = evaluar_muestra({ id_muestra: 'P8', cao: 95.8, mgo: 0.3, sio2: 2.5, contexto: { base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null } } as any)
  const ev = { drx: { fases: [{ mineral: 'Calcita', porcentaje: null }], imagen: true }, termicas: { conductividad: 0.24 }, petrografia: { imagenes: ['f1 (LP/PPL)'] }, imagenes: [] }

  const petro = mensaje_informe('petrografia', m, ev)
  for (const t of ['<frx>', '<evaluacion_geoquimica>', '<drx>', '<propiedades_termofisicas>', '<analisis_disponibles>']) expect(petro).not.toContain(t)
  expect(petro).toContain('<petrografia>')
  const sysPetro = system_prompt_informe('petrografia', {}, { petrografia: true, drx: true })
  expect(sysPetro).toContain('es SOLO de petrografía')
  expect(sysPetro).toContain('Cada foto es un campo de la lámina')
  expect(sysPetro).not.toContain('Criterios de apoyo')
  expect(sysPetro).not.toContain('escala del patrón superpuesto')
  expect(tarea_informe('petrografia')).not.toContain('DRX y el FRX')

  for (const a of ['frx', 'drx', 'termicas'] as const) {
    expect(system_prompt_informe(a, {}, {})).toContain('es SOLO de')
    expect(system_prompt_informe(a, {}, {})).not.toContain('NO REALIZADO')
  }
  expect(mensaje_informe('drx', m, ev)).not.toContain('<frx>')

  const sysIntegral = system_prompt_informe('integral', {}, { petrografia: true, drx: true })
  expect(sysIntegral).toContain('NO REALIZADO')
  expect(sysIntegral).not.toContain('es SOLO de')
  expect(mensaje_informe('integral', m, ev)).toContain('<analisis_disponibles>')
})

it('los criterios fijos de térmicas aplican aunque el prompt sea personalizado', () => {
  const s = system_prompt_informe('termicas', { termicas: 'Compara las muestras entre sí.' } as any, {} as any)
  expect(s).toContain('Compara las muestras entre sí.')
  expect(s).toContain('no demuestra buen contacto')
  expect(s).toContain('SH-3')
  expect(system_prompt_informe('frx', {} as any, {} as any)).toContain('Omnian mide varias condiciones')
})
