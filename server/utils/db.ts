// Capa de datos con @libsql/client.
// Local: file:./calizas.db. Turso futuro: TURSO_URL + TURSO_TOKEN en env (sin credenciales hardcodeadas).
// Portado 1:1 del esquema de backend/database.py (38 columnas).

import { createClient, type Client } from '@libsql/client'
import { resolve } from 'node:path'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
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

export const COLUMNAS_PROMPT = { informe: 'prompt_informe', mercado: 'contexto_mercado', region: 'region_mercado', busqueda_web: 'busqueda_web', petrografia: 'prompt_petrografia', frx: 'prompt_frx', drx: 'prompt_drx', termicas: 'prompt_termicas' } as const
export type Prompts = Partial<Record<keyof typeof COLUMNAS_PROMPT, string>>

export async function ensureSchema(db: Client = getClient()): Promise<void> {
  await db.execute(SCHEMA_SQL)
  const columns = await db.execute('PRAGMA table_info(muestras)')
  for (const [name, type] of [['contexto_json', 'TEXT'], ['version_evaluacion', 'INTEGER'], ['interpretacion_ia', 'TEXT'], ['interpretacion_fecha', 'TEXT'], ['fecha_modificacion', 'TEXT'], ['coordenadas_muestreo', 'TEXT'], ['direccion_muestreo', 'TEXT'], ['informe_integral', 'TEXT'], ['informe_estado', 'TEXT'], ['informe_modelo', 'TEXT'], ['informe_fecha', 'TEXT']]) {
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
  await db.execute(`CREATE TABLE IF NOT EXISTS analisis_termicos (
    id_muestra TEXT PRIMARY KEY, tecnica TEXT NOT NULL, laboratorio TEXT,
    fecha_ensayo TEXT, atmosfera TEXT, tasa_calentamiento REAL,
    temperatura_inicio REAL, temperatura_fin REAL, temperatura_evento REAL,
    perdida_masa REAL, observaciones TEXT, fecha_registro TEXT NOT NULL
  )`)
  const termicas = await db.execute('PRAGMA table_info(analisis_termicos)')
  for (const [name, type] of [['sensor', 'TEXT'], ['nivel_lectura', 'TEXT'], ['duracion_min', 'REAL'], ['temperatura_muestra', 'REAL'], ['hora_ensayo', 'TEXT'], ['difusividad', 'REAL'], ['capacidad_volumetrica', 'REAL'], ['conductividad', 'REAL'], ['syx', 'REAL']]) {
    if (!termicas.rows.some(row => row.name === name)) await db.execute(`ALTER TABLE analisis_termicos ADD COLUMN ${name} ${type}`)
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS archivos_muestra (
    id INTEGER PRIMARY KEY AUTOINCREMENT, id_muestra TEXT NOT NULL, tipo TEXT NOT NULL,
    nombre TEXT NOT NULL, mime TEXT NOT NULL, contenido BLOB NOT NULL, fecha TEXT NOT NULL,
    UNIQUE (id_muestra, tipo)
  )`)
  // DRX: una o varias gráficas (difractogramas) por muestra; el PNG es lo que ve el modelo, el original se conserva.
  await db.execute(`CREATE TABLE IF NOT EXISTS drx_graficas (
    id INTEGER PRIMARY KEY AUTOINCREMENT, id_muestra TEXT NOT NULL, nombre TEXT NOT NULL,
    png BLOB NOT NULL, original BLOB, original_mime TEXT, fecha TEXT NOT NULL
  )`)
  // migra la gráfica única que antes vivía en archivos_muestra
  await db.execute(`INSERT INTO drx_graficas (id_muestra, nombre, png, original, original_mime, fecha)
    SELECT a.id_muestra, a.nombre, a.contenido, p.contenido, CASE WHEN p.contenido IS NULL THEN NULL ELSE 'application/pdf' END, a.fecha
    FROM archivos_muestra a LEFT JOIN archivos_muestra p ON p.id_muestra = a.id_muestra AND p.tipo = 'drx_pdf' WHERE a.tipo = 'drx_png'`)
  await db.execute("DELETE FROM archivos_muestra WHERE tipo IN ('drx_png', 'drx_pdf')")
  await db.execute(`CREATE TABLE IF NOT EXISTS informes (
    id_muestra TEXT NOT NULL, alcance TEXT NOT NULL, informe TEXT NOT NULL, estado TEXT NOT NULL,
    modelo TEXT, fecha TEXT NOT NULL, PRIMARY KEY (id_muestra, alcance)
  )`)
  await db.execute(`INSERT OR IGNORE INTO informes (id_muestra, alcance, informe, estado, modelo, fecha)
    SELECT id_muestra, 'integral', informe_integral, COALESCE(informe_estado, 'borrador'), informe_modelo, COALESCE(informe_fecha, fecha_registro)
    FROM muestras WHERE informe_integral IS NOT NULL AND informe_integral <> ''`)
  await db.execute(`CREATE TABLE IF NOT EXISTS ai_configuracion (
    tipo TEXT PRIMARY KEY, base_url TEXT NOT NULL, modelo TEXT NOT NULL, api_key_enc TEXT
  )`)
  const aiCols = await db.execute('PRAGMA table_info(ai_configuracion)')
  for (const col of Object.values(COLUMNAS_PROMPT)) if (!aiCols.rows.some(row => row.name === col)) await db.execute(`ALTER TABLE ai_configuracion ADD COLUMN ${col} TEXT`)
}

function claveCifrado(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET es necesario para guardar claves de IA')
  return createHash('sha256').update(secret).digest()
}

function cifrarClave(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', claveCifrado(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64')).join('.')
}

function descifrarClave(value: string): string {
  const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', claveCifrado(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export async function admin_config_ia_db(userId: string, db: Client = getClient()): Promise<boolean> {
  const first = await db.execute('SELECT id FROM "user" ORDER BY "createdAt", id LIMIT 1')
  return first.rows[0]?.id === userId
}

export async function obtener_config_petrografia_db(db: Client = getClient()) {
  const result = await db.execute("SELECT * FROM ai_configuracion WHERE tipo = 'petrografia'")
  const row = result.rows[0]
  const envKey = process.env.PETROGRAFIA_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || ''
  const fallbackKey = envKey.startsWith('REEMPLAZAR_') ? '' : envKey
  return {
    baseURL: String(row?.base_url || process.env.PETROGRAFIA_BASE_URL || 'https://openrouter.ai/api/v1'),
    model: String(row?.modelo || process.env.PETROGRAFIA_MODEL || 'google/gemini-3.8-flash'),
    apiKey: row?.api_key_enc ? descifrarClave(String(row.api_key_enc)) : fallbackKey,
    savedKey: Boolean(row?.api_key_enc),
    prompts: Object.fromEntries(Object.entries(COLUMNAS_PROMPT).map(([k, col]) => [k, String(row?.[col] || '')])) as Required<Prompts>,
  }
}

export async function guardar_config_petrografia_db(baseURL: string, model: string, apiKey: string, prompts: Prompts = {}, db: Client = getClient()): Promise<void> {
  const current = await db.execute("SELECT api_key_enc FROM ai_configuracion WHERE tipo = 'petrografia'")
  const encrypted = apiKey ? cifrarClave(apiKey) : current.rows[0]?.api_key_enc || null
  const cols = Object.values(COLUMNAS_PROMPT)
  await db.execute({ sql: `INSERT INTO ai_configuracion (tipo, base_url, modelo, api_key_enc, ${cols.join(', ')}) VALUES ('petrografia', ?, ?, ?, ${cols.map(() => '?').join(', ')})
    ON CONFLICT(tipo) DO UPDATE SET base_url=excluded.base_url, modelo=excluded.modelo, api_key_enc=excluded.api_key_enc, ${cols.map(c => `${c}=excluded.${c}`).join(', ')}`,
    args: [baseURL, model, encrypted, ...Object.keys(COLUMNAS_PROMPT).map(k => prompts[k as keyof Prompts]?.trim() || null)] })
}

export function error_db(statusCode: number, message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode, statusMessage: message })
}

const CAMPOS = `id_muestra caco3 cao mgo sio2 fe2o3 al2o3 so3 na2o k2o p2o5 pb cd as_ppm drx petrografia loi res_insol alcalis lsf sm am c3s c2s c3a c4af estado_eval archivo_fuente fecha_registro dictamenes_json pn blancura tamano_particula humedad cao_disponible cao_reactivo resistencia absorcion contexto_json version_evaluacion coordenadas_muestreo direccion_muestreo`.split(' ')

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

export async function obtener_muestras_db(db: Client = getClient(), id?: string): Promise<any[]> {
  // Banderas por análisis y estado del informe integral: la tabla del historial las muestra sin pedir cada detalle.
  const res = await db.execute({ sql: `SELECT m.*, e.nombre AS evidencia_nombre, e.fecha AS evidencia_fecha,
      (EXISTS(SELECT 1 FROM drx_fases d WHERE d.id_muestra = m.id_muestra) OR EXISTS(SELECT 1 FROM drx_graficas g WHERE g.id_muestra = m.id_muestra)) AS tiene_drx,
      (EXISTS(SELECT 1 FROM petrografias p WHERE p.id_muestra = m.id_muestra AND p.informe <> '') OR EXISTS(SELECT 1 FROM petrografia_imagenes i WHERE i.id_muestra = m.id_muestra)) AS tiene_petrografia,
      EXISTS(SELECT 1 FROM analisis_termicos t WHERE t.id_muestra = m.id_muestra) AS tiene_termicas,
      (SELECT estado FROM informes r WHERE r.id_muestra = m.id_muestra AND r.alcance = 'integral') AS informe_integral_estado
    FROM muestras m LEFT JOIN evidencias e ON m.id_muestra = e.id_muestra ${id ? 'WHERE m.id_muestra = ?' : ''} ORDER BY m.fecha_registro DESC`, args: id ? [id] : [] })
  return res.rows.map(row => {
    const dictamenes = leerJSON(row.dictamenes_json)
    const contexto = leerJSON(row.contexto_json)
    return { ...row, tiene_drx: Boolean(row.tiene_drx), tiene_petrografia: Boolean(row.tiene_petrografia), tiene_termicas: Boolean(row.tiene_termicas),
      dictamenes: resumir_dictamenes(dictamenes) ? dictamenes : null,
      contexto: contexto && typeof contexto === 'object' && !Array.isArray(contexto) ? contexto : null,
      resumen: resumir_dictamenes(Array.isArray(dictamenes) ? dictamenes : null),
      evidencia: row.evidencia_nombre ? { nombre: row.evidencia_nombre, fecha: row.evidencia_fecha } : null }
  })
}

export async function borrar_muestra_db(id_muestra: string, db: Client = getClient()): Promise<void> {
  await db.batch([
    { sql: 'DELETE FROM analisis_termicos WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM drx_fases WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM drx_ensayos WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM petrografia_imagenes WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM petrografias WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM evidencias WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM archivos_muestra WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM drx_graficas WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM informes WHERE id_muestra = ?', args: [id_muestra] },
    { sql: 'DELETE FROM muestras WHERE id_muestra = ?', args: [id_muestra] },
  ], 'write')
}

export async function obtener_petrografia_db(id: string, db: Client = getClient()) {
  const muestra = await db.execute({ sql: 'SELECT id_muestra, coordenadas_muestreo, direccion_muestreo FROM muestras WHERE id_muestra = ?', args: [id] })
  if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
  const informe = await db.execute({ sql: 'SELECT informe, estado, datos_json, modelo, fecha FROM petrografias WHERE id_muestra = ?', args: [id] })
  const imagenes = await db.execute({ sql: 'SELECT id, nombre, condicion FROM petrografia_imagenes WHERE id_muestra = ? ORDER BY id', args: [id] })
  return { ...(informe.rows[0] || {}), datos: informe.rows[0] ? leerJSON(informe.rows[0].datos_json) : null, imagenes: imagenes.rows,
    muestreo: { coordenadas: muestra.rows[0].coordenadas_muestreo, direccion: muestra.rows[0].direccion_muestreo } }
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

export async function obtener_analisis_termico_db(id: string, db: Client = getClient()) {
  const muestra = await db.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
  if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
  const res = await db.execute({ sql: 'SELECT tecnica, laboratorio, fecha_ensayo, atmosfera, tasa_calentamiento, temperatura_inicio, temperatura_fin, temperatura_evento, perdida_masa, sensor, nivel_lectura, duracion_min, temperatura_muestra, hora_ensayo, difusividad, capacidad_volumetrica, conductividad, syx, observaciones, fecha_registro FROM analisis_termicos WHERE id_muestra = ?', args: [id] })
  return res.rows[0] || null
}

export async function guardar_analisis_termico_db(id: string, dato: Record<string, string | number | null>, db: Client = getClient()) {
  const campos = ['tecnica', 'laboratorio', 'fecha_ensayo', 'atmosfera', 'tasa_calentamiento', 'temperatura_inicio', 'temperatura_fin', 'temperatura_evento', 'perdida_masa', 'sensor', 'nivel_lectura', 'duracion_min', 'temperatura_muestra', 'hora_ensayo', 'difusividad', 'capacidad_volumetrica', 'conductividad', 'syx', 'observaciones']
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    await tx.execute({ sql: `INSERT INTO analisis_termicos (id_muestra, ${campos.join(', ')}, fecha_registro) VALUES (${Array(campos.length + 2).fill('?').join(', ')})
      ON CONFLICT(id_muestra) DO UPDATE SET ${campos.map(c => `${c}=excluded.${c}`).join(', ')}, fecha_registro=excluded.fecha_registro`,
      args: [id, ...campos.map(c => dato[c] ?? null), new Date().toISOString()] })
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



export async function obtener_imagenes_petrografia_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, condicion, tipo, contenido FROM petrografia_imagenes WHERE id_muestra = ? ORDER BY id', args: [id] })
  return res.rows.map(r => ({ nombre: String(r.nombre), condicion: String(r.condicion), tipo: String(r.tipo), contenido: r.contenido as ArrayBuffer }))
}

export const ALCANCES = ['integral', 'petrografia', 'frx', 'drx', 'termicas'] as const
export type Alcance = typeof ALCANCES[number]
type Informe = { informe: string; estado: string; modelo: string | null; fecha: string }

// El informe de petrografía es el mismo del módulo Petrografía (tabla petrografias); los demás viven en `informes`.
export async function obtener_informes_db(id: string, db: Client = getClient()): Promise<Partial<Record<Alcance, Informe>>> {
  const [otros, petro] = await Promise.all([
    db.execute({ sql: 'SELECT alcance, informe, estado, modelo, fecha FROM informes WHERE id_muestra = ?', args: [id] }),
    db.execute({ sql: "SELECT informe, estado, modelo, fecha FROM petrografias WHERE id_muestra = ? AND informe <> ''", args: [id] }),
  ])
  const res: Partial<Record<Alcance, Informe>> = {}
  for (const r of otros.rows) res[r.alcance as Alcance] = { informe: String(r.informe), estado: String(r.estado), modelo: r.modelo == null ? null : String(r.modelo), fecha: String(r.fecha) }
  if (petro.rows[0]) { const r = petro.rows[0]; res.petrografia = { informe: String(r.informe), estado: String(r.estado), modelo: r.modelo == null ? null : String(r.modelo), fecha: String(r.fecha) } }
  return res
}

// Borra el informe de un alcance. En petrografía solo se vacía el informe: las fotos y sus datos se conservan.
export async function borrar_informe_db(id: string, alcance: Alcance, db: Client = getClient()) {
  if (alcance === 'petrografia') await db.execute({ sql: "UPDATE petrografias SET informe = '', estado = 'borrador', modelo = NULL WHERE id_muestra = ?", args: [id] })
  else await db.execute({ sql: 'DELETE FROM informes WHERE id_muestra = ? AND alcance = ?', args: [id, alcance] })
}

export async function guardar_informe_db(id: string, alcance: Alcance, informe: string, estado: string, modelo: string | null, db: Client = getClient()) {
  const muestra = await db.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
  if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
  const fecha = new Date().toISOString()
  if (alcance === 'petrografia') {
    await db.execute({ sql: `INSERT INTO petrografias (id_muestra, informe, estado, datos_json, modelo, fecha) VALUES (?, ?, ?, '{}', ?, ?)
      ON CONFLICT(id_muestra) DO UPDATE SET informe=excluded.informe, estado=excluded.estado, modelo=COALESCE(excluded.modelo, petrografias.modelo), fecha=excluded.fecha`,
      args: [id, informe, estado, modelo, fecha] })
    return
  }
  await db.execute({ sql: `INSERT INTO informes (id_muestra, alcance, informe, estado, modelo, fecha) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id_muestra, alcance) DO UPDATE SET informe=excluded.informe, estado=excluded.estado, modelo=COALESCE(excluded.modelo, informes.modelo), fecha=excluded.fecha`,
    args: [id, alcance, informe, estado, modelo, fecha] })
}

// Un archivo por tipo y muestra; subir de nuevo el mismo tipo lo reemplaza.
export const TIPOS_ARCHIVO = {
  frx_tabla_pdf: 'application/pdf', frx_tabla_png: 'image/png',
  frx_espectro_pdf: 'application/pdf', frx_espectro_png: 'image/png',
} as const
export type TipoArchivo = keyof typeof TIPOS_ARCHIVO

export async function guardar_archivos_db(id: string, archivos: Array<{ tipo: TipoArchivo; nombre: string; contenido: Uint8Array }>, db: Client = getClient()) {
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    const fecha = new Date().toISOString()
    for (const a of archivos) await tx.execute({ sql: `INSERT INTO archivos_muestra (id_muestra, tipo, nombre, mime, contenido, fecha) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_muestra, tipo) DO UPDATE SET nombre=excluded.nombre, mime=excluded.mime, contenido=excluded.contenido, fecha=excluded.fecha`,
      args: [id, a.tipo, a.nombre, TIPOS_ARCHIVO[a.tipo], a.contenido, fecha] })
    await tx.commit()
  } finally { tx.close() }
}

export async function listar_archivos_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT id, tipo, nombre, mime, fecha FROM archivos_muestra WHERE id_muestra = ? ORDER BY tipo', args: [id] })
  return res.rows
}

export async function obtener_archivo_db(id: string, archivoId: number, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, mime, contenido FROM archivos_muestra WHERE id_muestra = ? AND id = ?', args: [id, archivoId] })
  if (!res.rows.length) throw error_db(404, 'Archivo no encontrado')
  return res.rows[0]
}

// Imágenes de informes de laboratorio (FRX tabla/espectro, DRX) para enviarlas al modelo.
export async function obtener_imagenes_frx_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: "SELECT tipo, contenido FROM archivos_muestra WHERE id_muestra = ? AND mime = 'image/png' ORDER BY CASE tipo WHEN 'frx_tabla_png' THEN 0 WHEN 'frx_espectro_png' THEN 1 ELSE 2 END", args: [id] })
  return res.rows.map(r => ({ tipo: String(r.tipo), contenido: r.contenido as ArrayBuffer }))
}

export const MAX_GRAFICAS_DRX = 8

// Reemplaza todas las gráficas DRX de la muestra (se suben como conjunto, igual que las fotos de petrografía).
export async function guardar_drx_graficas_db(id: string, graficas: Array<{ nombre: string; png: Uint8Array; original?: Uint8Array | null; original_mime?: string | null }>, db: Client = getClient()) {
  const tx = await db.transaction('write')
  try {
    const muestra = await tx.execute({ sql: 'SELECT id_muestra FROM muestras WHERE id_muestra = ?', args: [id] })
    if (!muestra.rows.length) throw error_db(404, 'La muestra no existe')
    await tx.execute({ sql: 'DELETE FROM drx_graficas WHERE id_muestra = ?', args: [id] })
    const fecha = new Date().toISOString()
    for (const g of graficas) await tx.execute({ sql: 'INSERT INTO drx_graficas (id_muestra, nombre, png, original, original_mime, fecha) VALUES (?, ?, ?, ?, ?, ?)', args: [id, g.nombre, g.png, g.original ?? null, g.original_mime ?? null, fecha] })
    await tx.commit()
  } finally { tx.close() }
}

export async function listar_drx_graficas_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT id, nombre, original_mime FROM drx_graficas WHERE id_muestra = ? ORDER BY id', args: [id] })
  return res.rows.map(r => ({ id: Number(r.id), nombre: String(r.nombre), original_mime: r.original_mime == null ? null : String(r.original_mime) }))
}

export async function obtener_drx_grafica_db(id: string, graficaId: number, original = false, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, png, original, original_mime FROM drx_graficas WHERE id_muestra = ? AND id = ?', args: [id, graficaId] })
  const r = res.rows[0]
  if (!r || (original && r.original == null)) throw error_db(404, 'Gráfica no encontrada')
  return original ? { nombre: String(r.nombre), mime: String(r.original_mime), contenido: r.original as ArrayBuffer } : { nombre: String(r.nombre).replace(/\.\w+$/, '.png'), mime: 'image/png', contenido: r.png as ArrayBuffer }
}

export async function obtener_drx_pngs_db(id: string, db: Client = getClient()) {
  const res = await db.execute({ sql: 'SELECT nombre, png FROM drx_graficas WHERE id_muestra = ? ORDER BY id', args: [id] })
  return res.rows.map(r => ({ nombre: String(r.nombre), contenido: r.png as ArrayBuffer }))
}
