import { expect, it } from 'vitest'
import { createClient } from '@libsql/client'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSchema, registrar_muestra_db, guardar_petrografia_db, obtener_petrografia_db, obtener_imagen_petrografia_db, borrar_muestra_db } from './db'
import { validar_datos_petrografia, validar_imagenes } from './petrografia'

it('valida imágenes y guarda un informe revisable ligado a la muestra', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'petro-'))
  const db = createClient({ url: `file:${join(folder, 'test.db')}` })
  try {
    await ensureSchema(db)
    await registrar_muestra_db({ id_muestra: 'P1' }, db)
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])
    expect(() => validar_imagenes([{ filename: 'mal.jpg', data: Buffer.from('texto'), condicion: 'LP/PPL' }])).toThrow()
    const [imagen] = validar_imagenes([{ filename: 'corte.png', data: png, condicion: 'NX/XPL' }])
    await guardar_petrografia_db('P1', 'Observación preliminar', 'borrador', validar_datos_petrografia({ aumento: '10x' }), 'gpt-4.1', [imagen], db)
    const dato = await obtener_petrografia_db('P1', db)
    expect(dato).toMatchObject({ informe: 'Observación preliminar', estado: 'borrador', datos: { aumento: '10x' } })
    expect(dato.imagenes).toHaveLength(1)
    expect(Buffer.from((await obtener_imagen_petrografia_db('P1', Number(dato.imagenes[0].id), db)).contenido as ArrayBuffer)).toEqual(png)
    await guardar_petrografia_db('P1', 'Corregido', 'revisado', { aumento: '10x' }, null, [], db)
    expect((await obtener_petrografia_db('P1', db)).imagenes).toHaveLength(1)
    await borrar_muestra_db('P1', db)
    await expect(obtener_petrografia_db('P1', db)).rejects.toMatchObject({ statusCode: 404 })
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }) }
})
