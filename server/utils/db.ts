// Capa de datos con @libsql/client.
// Local: file:./calizas.db. Turso futuro: TURSO_URL + TURSO_TOKEN en env (sin credenciales hardcodeadas).
// Portado 1:1 del esquema de backend/database.py (38 columnas).

import { createClient, type Client } from '@libsql/client'
import { resolve } from 'node:path'

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

export async function ensureSchema(): Promise<void> {
  await getClient().execute(SCHEMA_SQL)
}

async function fechaAhora(): Promise<string> {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export async function registrar_muestra_db(datos: Record<string, any>): Promise<void> {
  const dictamenes_json = JSON.stringify(datos.dictamenes ?? [])
  const extras = datos.extras ?? {}
  const fecha = datos.fecha_registro || (await fechaAhora())

  await getClient().execute({
    sql: `INSERT OR REPLACE INTO muestras (
        id_muestra, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm,
        drx, petrografia, loi, res_insol, alcalis, lsf, sm, am, c3s, c2s, c3a, c4af,
        estado_eval, archivo_fuente, fecha_registro, dictamenes_json,
        pn, blancura, tamano_particula, humedad, cao_disponible, cao_reactivo, resistencia, absorcion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      datos.id_muestra,
      datos.caco3, datos.cao, datos.mgo, datos.sio2, datos.fe2o3, datos.al2o3, datos.so3,
      datos.na2o ?? null, datos.k2o ?? null, datos.p2o5 ?? null, datos.pb ?? null, datos.cd ?? null, datos.as_ppm ?? null,
      datos.drx ?? 'Calcita', datos.petrografia ?? 'Micrítica de grano fino',
      datos.loi, datos.res_insol, datos.alcalis,
      datos.lsf, datos.sm, datos.am, datos.c3s, datos.c2s, datos.c3a, datos.c4af,
      datos.estado_eval, datos.archivo_fuente ?? 'Manual', fecha,
      dictamenes_json,
      extras.pn ?? null, extras.blancura ?? null, extras.tamano_particula ?? null, extras.humedad ?? null,
      extras.cao_disponible ?? null, extras.cao_reactivo ?? null, extras.resistencia ?? null, extras.absorcion ?? null,
    ],
  })
}

export async function obtener_muestras_db(): Promise<any[]> {
  const res = await getClient().execute('SELECT * FROM muestras ORDER BY fecha_registro DESC')
  const filas = res.rows as any[]
  for (const d of filas) {
    try {
      d.dictamenes = d.dictamenes_json ? JSON.parse(d.dictamenes_json) : []
    } catch {
      d.dictamenes = []
    }
  }
  return filas
}

export async function borrar_muestra_db(id_muestra: string): Promise<void> {
  await getClient().execute({
    sql: 'DELETE FROM muestras WHERE id_muestra = ?',
    args: [id_muestra],
  })
}