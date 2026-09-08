// Regresiones del motor: conservación numérica y dictámenes con datos pendientes.
import { describe, it, expect } from 'vitest'
import {
  parsear_reporte_xrf, convertir_base_seca, es_base_calcinada,
  validar_extraccion, calcular_evaluacion,
} from './calculos'

// Fragmento real de un reporte Omnian (M10)
const TEXTO_XRF = `10-feb-2026 14:24:51 Page 1  Sample results
M10
Sample ident
Application<Omnian>
Compound MgO Al2O3 SiO2 Cl K2O CaO Ti V Cr Mn Fe2O3 Zn As
Conc 0,302 0,333 1,476 0,0 0,131 97,501 95,3 26,5 15,6 175,4 0,198 67,6 0,0
Unit % % % ppm % % ppm ppm ppm ppm % ppm ppm
Compound Zr Sn Sm Pb Eu Yb Lu Re
Conc 42,9 115,9 9,8 23,8 0,0 13,0 4,1 0,0
Unit ppm ppm ppm ppm ppm ppm ppm ppm`

describe('parseo XRF', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  it('muestra_id y óxidos', () => {
    expect(d).not.toBeNull()
    expect(d.muestra_id).toBe('M10')
    expect(d.cao).toBe(97.501)
    expect(d.mgo).toBe(0.302)
    expect(d.sio2).toBe(1.476)
    expect(d.pb).toBe(23.8)
    expect(d.cd).toBeNull()
  })
  it('texto sin tabla retorna null', () => {
    expect(parsear_reporte_xrf('texto sin tabla alguna')).toBeNull()
  })
})

describe('detección de base calcinada', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  it('M10 calcinado', () => expect(es_base_calcinada(d)).toBe(true))
  it('caliza seca típica', () => expect(es_base_calcinada({ cao: 52.0, sio2: 3.0 })).toBe(false))
})

describe('conversión a base seca', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  const seco = convertir_base_seca(d)
  it('LOI estimado 43.45', () => expect(Math.abs(seco['loi_estimado'] - 43.45)).toBeLessThan(0.1))
  it('cao 55.13', () => expect(Math.abs(seco['cao'] - 55.13)).toBeLessThan(0.05))
  it('caco3 98.4', () => expect(Math.abs(seco['caco3'] - 98.4)).toBeLessThan(0.1))
  it('ya no es base calcinada', () => expect(es_base_calcinada(seco)).toBe(false))
  it('con LOI medido 43', () => {
    const seco2 = convertir_base_seca(d, 43.0)
    expect(Math.abs(seco2['cao'] - 97.501 * 0.57)).toBeLessThan(0.01)
  })
})

describe('validación de extracción', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  const seco = convertir_base_seca(d)
  it('avisa base calcinada en M10 crudo', () => {
    expect(validar_extraccion(d).some((a) => a.includes('conversión estimada a base seca'))).toBe(true)
  })
  it('no avisa en datos secos', () => {
    expect(validar_extraccion(seco).some((a) => a.includes('conversión estimada a base seca'))).toBe(false)
  })
})

// Helper: construye la llamada posicional de calcular_evaluacion con los 13 campos
// en el orden de la firma: (caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm)
function evalCon(datos: Record<string, number | null>, extras?: Record<string, number | null>) {
  const args: [number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null] = [
    datos.caco3 ?? null, datos.cao ?? null, datos.mgo ?? null, datos.sio2 ?? null, datos.fe2o3 ?? null,
    datos.al2o3 ?? null, datos.so3 ?? null, datos.na2o ?? null, datos.k2o ?? null, datos.p2o5 ?? null,
    datos.pb ?? null, datos.cd ?? null, datos.as_ppm ?? null,
  ]
  return calcular_evaluacion(...args, 'Micrítica de grano fino', true, 0, 0, 0, extras ?? null, { base: 'seca', base_trazas: 'seca' })
}

describe('evaluación completa', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  const seco = convertir_base_seca(d)

  const r = evalCon(seco)
  const r_calc = evalCon(d)

  it('estado_eval válido', () => {
    expect(r.estado_eval).toBeNull()
    expect(r.resumen).not.toBeNull()
  })
  it('invariantes LSF ante cambio de base', () => {
    expect(Math.abs(r.lsf - r_calc.lsf)).toBeLessThan(0.2)
  })
  it('CaO seco cae al rango real de caliza', () => {
    expect(seco['cao']).toBeGreaterThanOrEqual(45)
    expect(seco['cao']).toBeLessThanOrEqual(58)
  })

  it('17 perfiles', () => {
    expect(r.dictamenes).toHaveLength(17)
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria cementera'].estado).toBe('Apto')
    expect(dic['Producción de cal viva'].estado).toBe('Apto')
    expect(dic['Industria cerámica'].estado).toBe('Apto')
    expect(dic['Industria del vidrio'].estado).toBe('No Apto')
    expect(dic['Industria química'].estado).toBe('No Apto')
    expect(dic['Industria alimentaria'].estado).toBe('No Apto')
    expect(dic['Material de construcción'].estado).toBe('Requiere ensayos')
    expect(dic['Industria del papel'].estado).toBe('Requiere ensayos')
    expect(dic['Cal agrícola'].estado).toBe('Requiere ensayos')
  })

  it('extras resuelven pendientes', () => {
    const r2 = evalCon(seco, { resistencia: 80.0, absorcion: 2.0, blancura: 96.0, tamano_particula: 1.5 })
    const dic2 = Object.fromEntries(r2.dictamenes.map((p) => [p.nombre, p]))
    expect(dic2['Material de construcción'].estado).toBe('Apto')
    expect(dic2['Industria del papel'].estado).toBe('Apto')
  })

  it('ensayo que falla umbral → No Apto', () => {
    const r3 = evalCon(seco, { resistencia: 30.0, absorcion: 2.0 })
    const dic3 = Object.fromEntries(r3.dictamenes.map((p) => [p.nombre, p]))
    expect(dic3['Material de construcción'].estado).toBe('No Apto')
  })
})

// Guard: la firma posicional debe mantenerse estable (compatibilidad API)
describe('firma de calcular_evaluacion (compatibilidad)', () => {
  it('acepta llamada posicional completa', () => {
    const r = calcular_evaluacion(94.8, 54.1, 0.8, 6.4, 1.9, 2.8, 2.4, 0.1, 0.2)
    expect(r.estado_eval).toBeDefined()
    expect(r.dictamenes).toHaveLength(17)
  })
})
