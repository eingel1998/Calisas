// Tests del motor portado — 1:1 con backend/test_calculos_calizas.py
import { describe, it, expect } from 'vitest'
import {
  parsear_reporte_xrf, convertir_base_seca, es_base_calcinada,
  validar_extraccion, calcular_evaluacion, estimar_metales_pesados,
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
    // Cd no viene en el reporte: debe quedar "no medido", jamás 0
    expect(d.cd).toBeNull()
    expect(d.so3).toBeNull()
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
    expect(validar_extraccion(d).some((a) => a.includes('base calcinada'))).toBe(true)
  })
  it('no avisa en datos secos', () => {
    expect(validar_extraccion(seco).some((a) => a.includes('base calcinada'))).toBe(false)
  })
})

// Helper: construye la llamada posicional de calcular_evaluacion con los 13 campos
// en el orden de la firma: (caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm)
function evalCon(
  datos: Record<string, number | null | undefined>,
  extras?: Record<string, number>,
  elementos: { nombre: string; conc: number; unidad: string }[] = [],
) {
  const num = (v: number | null | undefined) => v ?? 0
  const opt = (v: number | null | undefined) => (v === null || v === undefined ? null : v)
  return calcular_evaluacion(
    num(datos.caco3), num(datos.cao), num(datos.mgo), num(datos.sio2), num(datos.fe2o3),
    num(datos.al2o3), opt(datos.so3), opt(datos.na2o), num(datos.k2o), opt(datos.p2o5),
    opt(datos.pb), opt(datos.cd), opt(datos.as_ppm),
    'Micrítica de grano fino', true, 0, 0, 0, extras ?? null, elementos,
  )
}

// reporte con trazas bajas: pasa el límite de metales pesados totales (<20 ppm)
const TRAZAS_LIMPIAS = [
  { nombre: 'Pb', conc: 1.0, unidad: 'ppm' },
  { nombre: 'As', conc: 1.0, unidad: 'ppm' },
]

describe('evaluación completa', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  const seco = convertir_base_seca(d)

  const r = evalCon(seco)
  const r_calc = evalCon(d)

  it('estado_eval válido', () => {
    expect(['APTO', 'NO APTO']).toContain(r.estado_eval)
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
    expect(dic['Cal agrícola'].estado).toBe('Apto')
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

// Guard del bug de falso "Apto": un analito NO medido (null) nunca debe
// contar como 0 y "cumplir" un límite de pureza o metales pesados.
describe('analitos no medidos → Requiere ensayos, no Apto', () => {
  const base = { caco3: 99.2, cao: 55.0, mgo: 0.3, sio2: 0.5, fe2o3: 0.02, al2o3: 0.3, k2o: 0.1 }

  it('Cd null deja alimentaria/farmacéutica en Requiere ensayos', () => {
    const r = evalCon({ ...base, pb: 1.0, cd: null, as_ppm: 1.0 }, undefined, TRAZAS_LIMPIAS)
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria alimentaria'].estado).toBe('Requiere ensayos')
    expect(dic['Industria alimentaria'].razon).toContain('Cd')
    expect(dic['Industria farmacéutica'].estado).toBe('Requiere ensayos')
  })

  it('con Cd medido bajo el límite pasa a Apto', () => {
    const r = evalCon({ ...base, pb: 1.0, cd: 0.4, as_ppm: 1.0 }, undefined, TRAZAS_LIMPIAS)
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria alimentaria'].estado).toBe('Apto')
  })

  it('SO3 y P2O5 null dejan siderúrgica en Requiere ensayos', () => {
    const r = evalCon({ ...base, so3: null, p2o5: null })
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria siderúrgica'].estado).toBe('Requiere ensayos')
  })

  it('resultado expone null, no 0, para lo no medido', () => {
    const r = evalCon({ ...base, cd: null, so3: null })
    expect(r.cd).toBeNull()
    expect(r.so3).toBeNull()
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

// El reporte del XRF viene calcinado (óxidos a 100% sin LOI). El motor debe
// reconstruir el CO2 antes de contrastar los criterios de pureza; si no lo
// hiciera, CaO ~97% daría CaCO3 >100%, saturaría en el tope y toda caliza
// limpia pasaría hasta los perfiles de máxima pureza.
describe('base calcinada: se evalúa sobre base carbonato', () => {
  const CALCINADO = `M10 Sample ident
Compound MgO Al2O3 SiO2 K2O CaO Fe2O3
Conc 0,302 0,333 1,476 0,131 97,501 0,198
Unit % % % % % %`

  it('CaCO3 se deriva en base carbonato, no satura', () => {
    const d = parsear_reporte_xrf(CALCINADO)!
    expect(d.cao).toBe(97.501)           // se conserva lo reportado
    expect(d.caco3).toBeCloseTo(98.4, 1) // y CaCO3 real, no 100
  })

  it('el dictamen usa la base carbonato y sigue discriminando', () => {
    const d = parsear_reporte_xrf(CALCINADO)!
    const r = evalCon({ ...d, pb: 1, cd: 0.1, as_ppm: 1, so3: 0.1, p2o5: 0.01 })
    expect(r.base_calcinada).toBe(true)
    expect(r.factor_base).toBeCloseTo(0.5655, 3)
    expect(r.base_evaluacion.cao).toBeCloseTo(55.13, 1)
    expect(r.base_evaluacion.caco3).toBeCloseTo(98.4, 1)

    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    // 98.4% no alcanza los umbrales de grado alimentario (>98.5) ni farmacéutico (>99)
    expect(dic['Industria farmacéutica'].estado).toBe('No Apto')
    expect(dic['Industria alimentaria'].estado).toBe('No Apto')
    // pero sí los de clinker y cal viva
    expect(dic['Industria cementera'].estado).toBe('Apto')
    expect(dic['Producción de cal viva'].estado).toBe('Apto')
  })

  it('los módulos cementeros se calculan sobre lo reportado (loss-free)', () => {
    const d = parsear_reporte_xrf(CALCINADO)!
    const r = evalCon(d)
    // LSF/SM/AM son razones: invariantes al factor de base. Se calculan sobre
    // los óxidos reportados, que es la práctica en cemento (base loss-free).
    const [cao, sio2, al2o3, fe2o3] = [97.5, 1.48, 0.33, 0.2] // tras safeFloat
    expect(r.lsf).toBeCloseTo(cao / (2.8 * sio2 + 1.2 * al2o3 + 0.65 * fe2o3), 3)
    expect(r.sm).toBeCloseTo(sio2 / (al2o3 + fe2o3), 3)
  })

  it('el veredicto ya no lo decide el LOI del cemento terminado', () => {
    const d = parsear_reporte_xrf(CALCINADO)!
    const r = evalCon(d)
    // una caliza tiene LOI ~43% por su CO2: antes reprobaba siempre
    expect(r.loi).toBeGreaterThan(40)
    expect(r.estado_eval).toBe('APTO')
    expect(r.errores_norma).toHaveLength(0)
  })
})

// El switch "Conversión a Base Seca" convierte antes de evaluar; con el switch
// apagado el motor lo hace internamente. Ambas rutas deben dar el mismo dictamen.
describe('invariante: pre-convertir o dejar que el motor convierta', () => {
  const d = parsear_reporte_xrf(TEXTO_XRF)!
  const crudo = evalCon({ ...d, caco3: 0 })
  const preconvertido = evalCon({ ...convertir_base_seca(d), caco3: 0 } as Record<string, number | null>)

  it('mismo CaCO3 de evaluación', () => {
    expect(crudo.base_evaluacion.caco3).toBeCloseTo(preconvertido.base_evaluacion.caco3, 1)
  })
  it('mismos 17 dictámenes', () => {
    expect(crudo.dictamenes.map((p) => p.estado)).toEqual(preconvertido.dictamenes.map((p) => p.estado))
  })
  it('mismo veredicto', () => {
    expect(crudo.estado_eval).toBe(preconvertido.estado_eval)
  })
  it('solo el crudo se marca como base calcinada', () => {
    expect(crudo.base_calcinada).toBe(true)
    expect(preconvertido.base_calcinada).toBe(false)
  })
})

// Los pendientes normativos se resuelven con estimación + salvedad, no
// bloqueando el dictamen: el usuario ve el resultado y por qué no es firme.
describe('confianza y salvedades del dictamen', () => {
  const puro = { caco3: 0, cao: 55.6, mgo: 0.1, sio2: 0.1, fe2o3: 0.01, al2o3: 0.05, k2o: 0.01 }
  const trazas = [
    { nombre: 'Pb', conc: 1.0, unidad: 'ppm' },
    { nombre: 'Sn', conc: 110.0, unidad: 'ppm' },
    { nombre: 'Te', conc: 119.0, unidad: 'ppm' },
  ]

  it('estima metales pesados totales desde el reporte XRF', () => {
    expect(estimar_metales_pesados(trazas)).toBeCloseTo(230, 0)
    expect(estimar_metales_pesados(trazas, 0.5655)).toBeCloseTo(130.1, 0)
    // sin trazas relevantes no se inventa un valor
    expect(estimar_metales_pesados([{ nombre: 'Ti', conc: 95, unidad: 'ppm' }])).toBeNull()
  })

  it('Sn y Te altos reprueban por metales pesados aunque Pb esté bien', () => {
    const r = evalCon({ ...puro, pb: 1, cd: 0.1, as_ppm: 1 }, undefined, trazas)
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria alimentaria'].estado).toBe('No Apto')
    expect(dic['Industria alimentaria'].razon).toContain('Metales pesados')
  })

  it('alimentaria y farmacéutica quedan marcadas como preliminares (falta ICP-MS)', () => {
    const r = evalCon({ ...puro, pb: 1, cd: 0.1, as_ppm: 1 }, undefined, [{ nombre: 'Pb', conc: 1, unidad: 'ppm' }])
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria alimentaria'].confianza).toBe('Preliminar')
    expect(dic['Industria alimentaria'].salvedades.join(' ')).toContain('ICP-MS')
    expect(dic['Industria farmacéutica'].confianza).toBe('Preliminar')
  })

  it('cal agrícola es Media: el PN va estimado desde CaCO3 equivalente', () => {
    const r = evalCon({ ...puro, pb: 1, cd: 0.1, as_ppm: 1 })
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Cal agrícola'].confianza).toBe('Media')
    expect(dic['Cal agrícola'].salvedades.join(' ')).toContain('NTC 5163')
  })

  it('con el PN medido la confianza sube a Alta', () => {
    const r = evalCon({ ...puro, pb: 1, cd: 0.1, as_ppm: 1 }, { pn: 92 })
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Cal agrícola'].confianza).toBe('Alta')
    expect(dic['Cal agrícola'].salvedades).toHaveLength(0)
  })

  it('los perfiles con química directa mantienen confianza Alta', () => {
    const r = evalCon({ ...puro, pb: 1, cd: 0.1, as_ppm: 1 })
    const dic = Object.fromEntries(r.dictamenes.map((p) => [p.nombre, p]))
    expect(dic['Industria cementera'].confianza).toBe('Alta')
    expect(dic['Industria del vidrio'].confianza).toBe('Alta')
  })
})
