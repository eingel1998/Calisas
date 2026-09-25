// Capa de datos con @libsql/client.
// Local: file:./calizas.db. Turso futuro: TURSO_URL + TURSO_TOKEN en env (sin credenciales hardcodeadas).
// Portado 1:1 del esquema de backend/database.py (38 columnas).

import { createClient, type Client } from '@libsql/client'
import { resolve } from 'node:path'
import { resumir_dictamenes } from './calculos'

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS muestras (
    id_muestra TEXT PRIMARY KEY,
    caco3 REAL,
    cao REAL,
    mgo REAL,
    sio2 REAL,
    fe2o3 REAL,
    al2o3 REAL,
    so3 REAL,
    na2o REAL,
    k2o REAL,
    p2o5 REAL,
    pb REAL,
    cd REAL,
    as_ppm REAL,
    drx TEXT,
    petrografia TEXT,
    loi REAL,
    res_insol REAL,
    alcalis REAL,
    lsf REAL,
    sm REAL,
    am REAL,
    c3s REAL,
    c2s REAL,
    c3a REAL,
    c4af REAL,
    estado_eval TEXT,
    archivo_fuente TEXT,
    fecha_registro TEXT,
    dictamenes_json TEXT,
    pn REAL,
    blancura REAL,
    tamano_particula REAL,
    humedad REAL,
    cao_disponible REAL,
    cao_reactivo REAL,
    resistencia REAL,
    absorcion REAL
)`

let client: Client | null = null

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_URL || `file:${resolve(process.cwd(), 'calizas.db')}`
    const authToken = process.env.TURSO_TOKEN || undefined
    // ponytail: default file:./calizas.db. Turso = setear TURSO_URL+TURSO_TOKEN en env, cero cambios.
    client = createClient({ url, authToken })
  }
  return client
}

export async function ensureSchema(db: Client = getClient()): Promise<void> {
  await db.execute(SCHEMA_SQL)
  const columns = await db.execute('PRAGMA table_info(muestras)')
  for (const [name, type] of [['contexto_json', 'TEXT'], ['version_evaluacion', 'INTEGER'], ['interpretacion_ia', 'TEXT'], ['interpretacion_fecha', 'TEXT'], ['fecha_modificacion', 'TEXT']]) {
    if (!columns.rows.some(row => row.name === name)) await db.execute(`ALTER TABLE muestras ADD COLUMN ${name} ${type}`)
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS evidencias (
    id_muestra TEXT PRIMARY KEY, nombre TEXT NOT NULL, tipo TEXT NOT NULL,
    contenido BLOB NOT NULL, fecha TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS petrografias (
    id_muestra TEXT PRIMARY KEY, informe TEXT NOT NULL, estado TEXT NOT NULL,
    datos_json TEXT NOT NULL, modelo TEXT, fecha TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS petrografia_imagenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, id_muestra TEXT NOT NULL,
    nombre TEXT NOT NULL, condicion TEXT NOT NULL, tipo TEXT NOT NULL, contenido BLOB NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS drx_fases (
    id_muestra TEXT NOT NULL, mineral TEXT NOT NULL, porcentaje REAL,
    PRIMARY KEY (id_muestra, mineral)
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS drx_ensayos (
    id_muestra TEXT PRIMARY KEY, laboratorio TEXT, fecha_ensayo TEXT,
    observaciones TEXT, fecha_registro TEXT NOT NULL
  )`)
}

export function error_db(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode, statusMessage: message })
}

const CAMPOS = `id_muestra caco3 cao mgo sio2 fe2o3 al2o3 so3 na2o k2o p2o5 pb cd as_ppm drx petrografia loi res_insol alcalis lsf sm am c3s c2s c3a c4af estado_eval archivo_fuente fecha_registro dictamenes_json pn blancura tamano_particula humedad cao_disponible cao_reactivo resistencia absorcion contexto_json version_evaluacion`.split(' ')

export async function registrar_muestras_db(datos: Record<string, any>[], db: Client = getClient()): Promise<void> {
  const tx = await db.transaction('write')
  try {
    for (const dato of datos) {
      if (typeof dato.id_muestra !== 'string' || !dato.id_muestra.trim()) throw error_db(400, 'Identificador de muestra vacío')
      const existente = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [dato.id_muestra] })
      if (existente.rows.length) throw error_db(409, `La muestra ${dato.id_muestra} ya existe`)
      const valores = {
        ...dato, ...dato.extras,
        archivo_fuente: dato.archivo_fuente ?? 'Manual',
        fecha_registro: dato.fecha_registro ?? new Date().toISOString(),
        dictamenes_json: dato.dictamenes == null ? null : JSON.stringify(dato.dictamenes),
        contexto_json: dato.contexto == null ? null : JSON.stringify(dato.contexto),
      }
      await tx.execute({
        sql: `INSERT INTO muestras (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
        args: CAMPOS.map(campo => valores[campo] ?? null),
      })
    }
    await tx.commit()
  } finally { tx.close() }
}

export async function registrar_muestra_db(datos: Record<string, any>, db: Client = getClient()): Promise<void> {
  await registrar_muestras_db([datos], db)
}

export async function actualizar_muestra_db(id: string, datos: Record<string, any>, fechaEsperada: string | null, db: Client = getClient()): Promise<void> {
  const tx = await db.transaction('write')
  try {
    const actual = await tx.execute({ sql: 'SELECT fecha_modificacion FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!actual.rows.length) throw error_db(404, 'La muestra no existe')
    if ((actual.rows[0].fecha_modificacion || null) !== fechaEsperada) throw error_db(409, 'La muestra cambió desde que la abriste; recarga el historial')
    const campos = CAMPOS.filter(c => !['id_muestra', 'fecha_registro', 'archivo_fuente'].includes(c))
    const valores = { ...datos, ...datos.extras, dictamenes_json: JSON.stringify(datos.dictamenes), contexto_json: JSON.stringify(datos.contexto) }
    const fecha = new Date().toISOString()
    await tx.execute({ sql: `UPDATE muestras SET ${campos.map(c => `${c} = ?`).join(', ')}, fecha_modificacion = ? WHERE id_muestra = ?`, args: [...campos.map(c => valores[c] ?? null), fecha, id] })
    await tx.commit()
  } finally { tx.close() }
}

function leerJSON(valor: unknown): any {
  try { return typeof valor === 'string' ? JSON.parse(valor) : null } catch { return null }
}

export async function obtener_muestras_db(db: Client = getClient()): Promise<any[]> {
  const res = await db.execute(`SELECT m.*, e.nombre AS evidencia_nombre, e.fecha AS evidencia_fecha
    FROM muestras m LEFT JOIN evidencias e ON m.id_muestra = e.id_muestra ORDER BY m.fecha_registro DESC`)
  return res.rows.map(row => {
    const dictamenes = leerJSON(row.dictamenes_json)
    const contexto = leerJSON(row.contexto_json)
    return { ...row, dictamenes: resumir_dictamenes(dictamenes) ? dictamenes : null,
      contexto: contexto && typeof contexto === 'object' && !Array.isArray(contexto) ? contexto : null,
      resumen: resumir_dictamenes(Array.isArray(dictamenes) ? dictamenes : null),
      evidencia: row.evidencia_nombre ? { nombre: row.evidencia_nombre, fecha: row.evidencia_fecha } : null }
  })
}

export async function borrar_muestra_db(id_muestra: string, db: Client = getClient()): Promise<void> {
  await db.batch([
    { sql: 'DELETE FROM drx_fases WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM drx_ensayos WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM petrografia_imagenes WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM petrografias WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM evidencias WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM muestras WHERE id_muestra = ?', args: [id_muestra] },
  ], 'write')
}

export async function obtener_petrografia_db(id: string, db: Client = getClient()) {
  const muestra = await db.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
  if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
  const informe = await db.execute({ sql: 'SELECT informe, estado, datos_json, modelo, fecha FROM petrografias WHERE id_muestra = ?', args: [id] })
  const imagenes = await db.execute({ sql: 'SELECT id, nombre, condicion FROM petrografia_imagenes WHERE id_muestra = ? ORDER BY id', args: [id] })
  return { ...(informe.rows[0] || {}), datos: informe.rows[0] ? leerJSON(informe.rows[0].datos_json) : null, imagenes: imagenes.rows }
}

export async function guardar_petrografia_db(id: string, informe: string, estado: string, datos: object, modelo: string | null, imagenes: Array<{ nombre: string; condicion: string; tipo: string; contenido: Uint8Array }> = [], db: Client = getClient()) {
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    await tx.execute({ sql: `INSERT INTO petrografias (id_muestra, informe, estado, datos_json, modelo, fecha) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_muestra) DO UPDATE SET informe=excluded.informe, estado=excluded.estado, datos_json=excluded.datos_json, modelo=excluded.modelo, fecha=excluded.fecha`,
      args: [id, informe, estado, JSON.stringify(datos), modelo, new Date().toISOString()] })
    if (imagenes.length) {
      await tx.execute({ sql: 'DELETE FROM petrografia_imagenes WHERE id_muestra = ?', args: [id] })
      for (const imagen of imagenes) await tx.execute({ sql: 'INSERT INTO petrografia_imagenes (id_muestra, nombre, condicion, tipo, contenido) VALUES (?, ?, ?, ?, ?)', args: [id, imagen.nombre, imagen.condicion, imagen.tipo, imagen.contenido] })
    }
    await tx.commit()
  } finally { tx.close() }
}

export async function obtener_imagen_petrografia_db(id: string, imagenId: number, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, tipo, contenido FROM petrografia_imagenes WHERE id_muestra = ? AND id = ?', args: [id, imagenId] })
  if (!res.rows.length) throw error_db(404, 'Imagen no encontrada')
  return res.rows[0]!
}

export async function obtener_drx_db(id: string, db: Client = getClient()) {
  const muestra = await db.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
  if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
  const ensayo = await db.execute({ sql: 'SELECT laboratorio, fecha_ensayo, observaciones, fecha_registro FROM drx_ensayos WHERE id_muestra = ?', args: [id] })
  const fases = await db.execute({ sql: 'SELECT mineral, porcentaje FROM drx_fases WHERE id_muestra = ? ORDER BY mineral', args: [id] })
  return { ...(ensayo.rows[0] || {}), fases: fases.rows }
}

export async function guardar_drx_db(id: string, ensayo: { laboratorio: string; fecha_ensayo: string; observaciones: string; fases: Array<{ mineral: string; porcentaje: number | null }> }, db: Client = getClient()) {
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    await tx.execute({ sql: `INSERT INTO drx_ensayos (id_muestra, laboratorio, fecha_ensayo, observaciones, fecha_registro) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id_muestra) DO UPDATE SET laboratorio=excluded.laboratorio, fecha_ensayo=excluded.fecha_ensayo, observaciones=excluded.observaciones, fecha_registro=excluded.fecha_registro`, args: [id, ensayo.laboratorio, ensayo.fecha_ensayo || null, ensayo.observaciones, new Date().toISOString()] })
    await tx.execute({ sql: 'DELETE FROM drx_fases WHERE id_muestra = ?', args: [id] })
    for (const fase of ensayo.fases) await tx.execute({ sql: 'INSERT INTO drx_fases (id_muestra, mineral, porcentaje) VALUES (?, ?, ?)', args: [id, fase.mineral, fase.porcentaje] })
    await tx.commit()
  } finally { tx.close() }
}

export async function guardar_evidencia_db(id: string, nombre: string, contenido: Uint8Array, reemplazar = false, db: Client = getClient()): Promise<void> {
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    const evidencia = await tx.execute({ sql: 'SELECT id_muestra FROM evidencias WHERE id_muestra = ?', args: [id] })
    if (evidencia.rows.length && !reemplazar) throw error_db(409, 'La muestra ya tiene evidencia; confirma su sustitución')
    await tx.execute({
      sql: `INSERT INTO evidencias (id_muestra, nombre, tipo, contenido, fecha) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id_muestra) DO UPDATE SET nombre=excluded.nombre, tipo=excluded.tipo, contenido=excluded.contenido, fecha=excluded.fecha`,
      args: [id, nombre, 'application/pdf', contenido, new Date().toISOString()],
    })
    await tx.commit()
  } finally { tx.close() }
}

export async function obtener_evidencia_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, tipo, contenido, fecha FROM evidencias WHERE id_muestra = ?', args: [id] })
  if (!res.rows.length) throw error_db(404, 'No hay evidencia para esta muestra')
  return res.rows[0]!
}

export async function guardar_interpretacion_db(id: string, texto: string, db: Client = getClient()): Promise<void> {
  await db.execute({
    sql: 'UPDATE muestras SET interpretacion_ia = ?, interpretacion_fecha = ? WHERE id_muestra = ?',
    args: [texto, new Date().toISOString(), id],
  })
}
