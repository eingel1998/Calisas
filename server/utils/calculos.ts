// Motor de evaluación geoquímica de calizas.
// Portado 1:1 de backend/calculos_calizas.py a TypeScript.
// MISMAS fórmulas, mismo orden de operaciones, mismos redondeos.

import type {
  DatosXRF,
  EnsayosOpcionales,
  PerfilDictamen,
  ResultadoEvaluacion,
} from './types'

export const OXIDOS = ['cao', 'mgo', 'sio2', 'fe2o3', 'al2o3', 'so3', 'na2o', 'k2o'] as const

export function safeFloat(val: unknown): number {
  if (val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
    return 0.0
  }
  return Math.round(Number(val) * 100) / 100
}

// --- Parseo de reporte XRF (Panalytical/Omnian) ---

export function parsear_reporte_xrf(texto: string): DatosXRF | null {
  // comp: nombre -> [valor, unidad]; CLAVE: 'Cl' colisiona con cálculos? no, solo leemos los que nos interesan luego.
  const comp = new Map<string, [number, string]>()
  const lineas = texto.split('\n').map((l) => l.trim().split(/\s+/).filter(Boolean))

  for (let i = 0; i < lineas.length; i++) {
    const tokens = lineas[i]
    if (tokens[0] === 'Compound') {
      const nombres = tokens.slice(1)
      let conc: string[] | null = null
      let unidades: string[] | null = null
      for (const t2 of lineas.slice(i + 1, i + 4)) {
        if (t2[0] === 'Conc') conc = t2.slice(1)
        else if (t2[0] === 'Unit') unidades = t2.slice(1)
      }
      if (conc && unidades) {
        const n = Math.min(nombres.length, conc.length, unidades.length)
        for (let j = 0; j < n; j++) {
          try {
            comp.set(nombres[j], [parseFloat(conc[j].replace(',', '.')), unidades[j]])
          } catch {
            // ignorar tokens corruptos
          }
        }
      }
    }
  }
  if (comp.size === 0) return null

  const pct = (nombre: string): number => {
    const [v, u] = comp.get(nombre) ?? [0.0, '%']
    return u === 'ppm' ? Math.round(v / 10000 * 10000) / 10000 : v
  }
  const ppm = (nombre: string): number => {
    const [v, u] = comp.get(nombre) ?? [0.0, 'ppm']
    return u === '%' ? v * 10000 : v
  }

  // ID de muestra: línea previa a "Sample ident"
  let muestra_id = ''
  const raw = texto.split('\n').map((l) => l.trim())
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === 'Sample ident') {
      const candidatos: string[] = []
      for (let k = i - 1; k >= 0; k--) {
        if (raw[k] && !raw[k].includes('Sample results')) candidatos.push(raw[k])
      }
      const sig = raw[i + 1] ? raw[i + 1] : ''
      if (sig && sig.length < 30 && !candidatos.includes(sig)) candidatos.push(sig)
      if (candidatos.length) muestra_id = candidatos[0]
      break
    }
  }

  return {
    muestra_id,
    caco3: 0.0,
    cao: pct('CaO'), mgo: pct('MgO'), sio2: pct('SiO2'),
    fe2o3: pct('Fe2O3'), al2o3: pct('Al2O3'), so3: pct('SO3'),
    na2o: pct('Na2O'), k2o: pct('K2O'),
    pb: ppm('Pb'), cd: ppm('Cd'), as_ppm: ppm('As'),
  }
}

export function es_base_calcinada(datos: { [k: string]: number }): boolean {
  return OXIDOS.reduce((s, k) => s + (datos[k] ?? 0.0), 0.0) > 95.0
}

export function convertir_base_seca(datos: { [k: string]: number }, loi?: number): { [k: string]: number } {
  let f: number
  if (loi) {
    f = (100.0 - loi) / 100.0
  } else {
    const co2 = (datos['cao'] ?? 0.0) * 0.7848 + (datos['mgo'] ?? 0.0) * 1.0919
    f = 100.0 / (100.0 + co2)
    loi = 100.0 * (1.0 - f)
  }

  const out: { [k: string]: number } = { ...datos }
  for (const k of [...OXIDOS, 'pb', 'cd', 'as_ppm']) {
    out[k] = Math.round((datos[k] ?? 0.0) * f * 10000) / 10000
  }
  out['caco3'] = Math.round(Math.min((out['cao'] ?? 0.0) * 1.7848, 100.0) * 100) / 100
  out['loi_estimado'] = Math.round(loi * 100) / 100
  return out
}

export function validar_extraccion(datos: { [k: string]: number }): string[] {
  const avisos: string[] = []
  const suma = OXIDOS.reduce((s, k) => s + (datos[k] ?? 0.0), 0.0)
  if (suma > 95.0) {
    avisos.push(`Los óxidos suman ${Math.round(suma * 10) / 10}%: el reporte parece estar en base calcinada (sin LOI). Active la conversión a base seca.`)
  }
  const faltantes = OXIDOS.filter((k) => (datos[k] ?? 0.0) === 0.0).map((k) => k.toUpperCase())
  if (faltantes.length) {
    avisos.push('No encontrados en el reporte (quedaron en 0): ' + faltantes.join(', ') + '.')
  }
  const rangos: Record<string, [number, number]> = { cao: [20, 100], mgo: [0, 45], sio2: [0, 60], fe2o3: [0, 20], al2o3: [0, 25] }
  for (const [k, [lo, hi]] of Object.entries(rangos)) {
    const v = datos[k] ?? 0.0
    if (v && !(lo <= v && v <= hi)) {
      avisos.push(`${k.toUpperCase()} = ${v}% fuera del rango plausible (${lo}-${hi}%) para una caliza. Posible error de lectura.`)
    }
  }
  return avisos
}

// --- Matriz de usos industriales de caliza (17 perfiles) ---

interface Criterio { campo: string; op: '>' | '<'; limite: number; etiqueta: string }
interface Perfil { nombre: string; aplicacion: string; norma: string; criterios: Criterio[]; nota?: string }

export const PERFILES_INDUSTRIALES: Perfil[] = [
  { nombre: 'Industria cementera', aplicacion: 'Fabricación de clinker y cemento Portland',
    norma: 'ASTM C150, ASTM C114, NTC 121, NTC 321',
    criterios: [['caco3', '>', 75, 'CaCO3 > 75%'], ['cao', '>', 42, 'CaO > 42%'],
      ['mgo', '<', 5, 'MgO < 5%'], ['sio2', '<', 15, 'SiO2 < 15%'],
      ['fe2o3', '<', 5, 'Fe2O3 < 5%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Producción de cal viva', aplicacion: 'Obtención de CaO mediante calcinación',
    norma: 'ASTM C25, ASTM C51, ASTM C911',
    criterios: [['caco3', '>', 95, 'CaCO3 > 95%'], ['sio2', '<', 2, 'SiO2 < 2%'],
      ['mgco3', '<', 5, 'MgCO3 < 5%'], ['fe2o3', '<', 1, 'Fe2O3 < 1%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Producción de cal hidratada', aplicacion: 'Producción de Ca(OH)2',
    norma: 'ASTM C206, ASTM C207, ASTM C911',
    criterios: [['cao_disponible', '>', 90, 'CaO disponible > 90%'], ['mgo', '<', 3, 'MgO < 3%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Cal agrícola', aplicacion: 'Neutralización de suelos ácidos',
    norma: 'NTC 5163, ASTM C602',
    criterios: [['caco3_eq', '>', 80, 'CaCO3 equivalente > 80%'], ['pn', '>', 80, 'Poder Neutralizante > 80%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria siderúrgica', aplicacion: 'Fundente en altos hornos',
    norma: 'ISO 12677, ASTM E1915',
    criterios: [['caco3', '>', 90, 'CaCO3 > 90%'], ['sio2', '<', 2, 'SiO2 < 2%'],
      ['p2o5', '<', 0.05, 'P2O5 < 0.05%'], ['s', '<', 0.03, 'S < 0.03%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria química', aplicacion: 'Carbonato de calcio precipitado y otros compuestos',
    norma: 'ASTM C602, ISO 3262',
    criterios: [['caco3', '>', 98, 'CaCO3 > 98%'], ['fe2o3', '<', 0.05, 'Fe2O3 < 0.05%'],
      ['mgo', '<', 1, 'MgO < 1%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria del vidrio', aplicacion: 'Fabricación de vidrio',
    norma: 'ASTM C146, ISO 1288',
    criterios: [['caco3', '>', 95, 'CaCO3 > 95%'], ['fe2o3', '<', 0.05, 'Fe2O3 < 0.05%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria cerámica', aplicacion: 'Producción de cerámica y porcelana',
    norma: 'ISO 13006, ASTM C373',
    criterios: [['caco3', '>', 90, 'CaCO3 > 90%'], ['fe2o3', '<', 0.5, 'Fe2O3 < 0.5%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria del papel', aplicacion: 'Carga mineral y recubrimiento',
    norma: 'ISO 2469, ISO 2470',
    criterios: [['caco3', '>', 98, 'CaCO3 > 98%'], ['blancura', '>', 95, 'Blancura > 95%'],
      ['tamano_particula', '<', 2, 'Tamaño de partícula < 2 µm']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria de pinturas', aplicacion: 'Pigmento y carga mineral',
    norma: 'ISO 3262-2, ASTM D1199',
    criterios: [['caco3', '>', 98, 'CaCO3 > 98%'], ['fe2o3', '<', 0.1, 'Fe2O3 < 0.1%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })),
    nota: 'Validar granulometría muy fina.' },
  { nombre: 'Industria del plástico', aplicacion: 'Carga mineral para polímeros',
    norma: 'ISO 3262, ASTM D5630',
    criterios: [['caco3', '>', 98, 'CaCO3 > 98%'], ['humedad', '<', 0.2, 'Humedad < 0.2%'],
      ['tamano_particula', '<', 5, 'Tamaño de partícula < 5 µm']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria del caucho', aplicacion: 'Material de relleno',
    norma: 'ASTM D1193, ISO 3262',
    criterios: [['caco3', '>', 97, 'CaCO3 > 97%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })),
    nota: 'Validar granulometría ultrafina.' },
  { nombre: 'Tratamiento de aguas', aplicacion: 'Neutralización y control del pH',
    norma: 'AWWA B202, ASTM C25',
    criterios: [['caco3', '>', 90, 'CaCO3 > 90%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })),
    nota: 'Requiere elevada reactividad / velocidad de disolución.' },
  { nombre: 'Protección ambiental', aplicacion: 'Neutralización de drenajes ácidos y desulfurización',
    norma: 'EPA Method 3052, ASTM C25',
    criterios: [['caco3', '>', 90, 'CaCO3 > 90%'], ['cao_reactivo', '>', 85, 'CaO reactivo > 85%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Material de construcción', aplicacion: 'Agregados, roca ornamental y afirmados',
    norma: 'ASTM C568, ASTM C97, ASTM C170, NTC 174',
    criterios: [['resistencia', '>', 50, 'Resistencia a compresión > 50 MPa'],
      ['absorcion', '<', 5, 'Absorción < 5%']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria alimentaria', aplicacion: 'Aditivo alimentario (E170)',
    norma: 'Codex Alimentarius, FCC, Reglamento (UE) 231/2012',
    criterios: [['caco3', '>', 98.5, 'CaCO3 > 98.5%'], ['pb', '<', 3, 'Pb < 3 ppm'],
      ['cd', '<', 1, 'Cd < 1 ppm'], ['as_ppm', '<', 3, 'As < 3 ppm']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
  { nombre: 'Industria farmacéutica', aplicacion: 'Excipiente y suplementos de calcio',
    norma: 'USP, Ph. Eur., BP',
    criterios: [['caco3', '>', 99, 'CaCO3 > 99%'], ['pb', '<', 3, 'Pb < 3 ppm'],
      ['cd', '<', 1, 'Cd < 1 ppm'], ['as_ppm', '<', 3, 'As < 3 ppm']].map((c) => ({ campo: c[0], op: c[1], limite: c[2], etiqueta: c[3] })) },
]

export function evaluar_perfiles(valores: { [k: string]: number | null | undefined }): PerfilDictamen[] {
  const resultados: PerfilDictamen[] = []
  for (const p of PERFILES_INDUSTRIALES) {
    const fallas: string[] = []
    const pendientes: string[] = []
    for (const { campo, op, limite, etiqueta } of p.criterios) {
      const v = valores[campo]
      if (v === null || v === undefined) {
        pendientes.push(etiqueta)
      } else if (!(op === '>' ? v > limite : v < limite)) {
        fallas.push(`${etiqueta} — medido: ${v}`)
      }
    }
    let estado: PerfilDictamen['estado'], razon: string
    if (fallas.length) {
      estado = 'No Apto'
      razon = 'Incumple: ' + fallas.join('; ')
    } else if (pendientes.length) {
      estado = 'Requiere ensayos'
      razon = 'Química conforme. Falta medir: ' + pendientes.join('; ')
    } else {
      estado = 'Apto'
      razon = 'Cumple todos los criterios químicos.'
    }
    if (p.nota) razon += ` ${p.nota}`
    resultados.push({ nombre: p.nombre, aplicacion: p.aplicacion, norma: p.norma, estado, razon })
  }
  return resultados
}

export function calcular_evaluacion(
  caco3: number, cao: number, mgo: number, sio2: number, fe2o3: number, al2o3: number, so3: number,
  na2o = 0.0, k2o = 0.0, p2o5 = 0.0, pb = 0.0, cd = 0.0, as_ppm = 0.0,
  petrografia = 'Micrítica de grano fino', guardar = true, loi = 0.0, res_insol = 0.0, alcalis = 0.0, extras: EnsayosOpcionales | null = null,
): ResultadoEvaluacion {
  caco3 = safeFloat(caco3); cao = safeFloat(cao); mgo = safeFloat(mgo)
  sio2 = safeFloat(sio2); fe2o3 = safeFloat(fe2o3); al2o3 = safeFloat(al2o3); so3 = safeFloat(so3)
  na2o = safeFloat(na2o); k2o = safeFloat(k2o); p2o5 = safeFloat(p2o5)
  pb = safeFloat(pb); cd = safeFloat(cd); as_ppm = safeFloat(as_ppm)

  if (guardar) {
    loi = (cao * 0.785) + (mgo * 1.092)
    res_insol = sio2 * 0.85
    alcalis = na2o + (0.658 * k2o)
  } else {
    loi = safeFloat(loi); res_insol = safeFloat(res_insol); alcalis = safeFloat(alcalis)
  }

  const denom_lsf = (2.8 * sio2) + (1.2 * al2o3) + (0.65 * fe2o3)
  const lsf = denom_lsf > 0 ? cao / denom_lsf : 0

  const denom_sm = al2o3 + fe2o3
  const sm = denom_sm > 0 ? sio2 / denom_sm : 0

  const am = fe2o3 > 0 ? al2o3 / fe2o3 : 0

  let interp_sm: string
  if (2.0 <= sm && sm <= 3.0) interp_sm = 'Adecuado'
  else if (sm > 3.0) interp_sm = 'Mezcla difícil de clinkerizar'
  else interp_sm = 'Bajo (Fuera de rango óptimo)'

  const interp_am = 1.3 <= am && am <= 2.5 ? 'Óptimo industrial' : 'Fuera de rango óptimo'

  const c3s = Math.max(0.0, Math.round(((4.071 * cao) - (7.600 * sio2) - (6.718 * al2o3) - (1.430 * fe2o3) - (2.852 * so3)) * 100) / 100)
  const c2s = Math.max(0.0, Math.round(((2.867 * sio2) - (0.7544 * c3s)) * 100) / 100)
  const c3a = Math.max(0.0, Math.round(((2.650 * al2o3) - (1.692 * fe2o3)) * 100) / 100)
  const c4af = Math.max(0.0, Math.round(3.043 * fe2o3 * 100) / 100)

  const advertencias_geol: string[] = []
  if (caco3 < 75) advertencias_geol.push(`CaCO3 de ${caco3}% está por debajo del recomendado (>75%).`)
  if (!(45 <= cao && cao <= 52)) advertencias_geol.push(`CaO de ${cao}% está fuera del rango óptimo (45-52%).`)
  if (!(5 <= sio2 && sio2 <= 15)) advertencias_geol.push(`SiO2 de ${sio2}% está fuera del rango recomendado (5-15%).`)
  if (!(1 <= fe2o3 && fe2o3 <= 5)) advertencias_geol.push(`Fe2O3 de ${fe2o3}% está fuera del rango recomendado (1-5%).`)
  if (!(1 <= al2o3 && al2o3 <= 6)) advertencias_geol.push(`Al2O3 de ${al2o3}% está fuera del rango recomendado (1-6%).`)

  const interp_cesar: string[] = []
  if (cao >= 45.0 && sio2 <= 15.0 && mgo <= 5.0) interp_cesar.push('✅ Depósito Favorable: Alto CaO, baja sílice y bajo MgO.')
  if (mgo > 5.0) interp_cesar.push('⚠️ Problemático - Dolomitización: Presencia de MgO alto.')
  if (sio2 > 15.0 && al2o3 > 6.0) interp_cesar.push('⚠️ Problemático - Intercalaciones arcillosas: Niveles altos de SiO2 y Al2O3.')
  else if (sio2 > 15.0 && al2o3 <= 6.0) interp_cesar.push('⚠️ Problemático - Chert: Sílice excesiva.')
  if (!interp_cesar.length) interp_cesar.push('ℹ️ Condiciones geológicas intermedias u ordinarias.')

  const errores_norma: string[] = []
  let cumple_norma = true
  if (mgo > 5.0) {
    cumple_norma = false
    errores_norma.push(`MgO (${mgo}%): Supera el límite de 5.0%. Evita la expansión perjudicial en el cemento endurecido.`)
  }
  if (so3 > 3.5) {
    cumple_norma = false
    errores_norma.push(`SO3 (${so3}%): Supera el límite de 3.5%. Controla el tiempo de fraguado y evita expansiones tardías.`)
  } else if (so3 < 3.0) {
    advertencias_geol.push(`SO3 (${so3}%) está por debajo del mínimo recomendado (3.0%). Controla el tiempo de fraguado.`)
  }
  if (loi > 3.0) {
    cumple_norma = false
    errores_norma.push(`LOI (${loi}%): Supera el límite de 3.0%. Indica una posible prehidratación o carbonatación indeseada.`)
  }
  if (res_insol > 0.75) {
    cumple_norma = false
    errores_norma.push(`Residuo Insoluble (${res_insol}%): Supera el límite de 0.75%. Control de impurezas.`)
  }
  if (alcalis > 0.6) {
    cumple_norma = false
    errores_norma.push(`Álcalis (${alcalis}%): Supera el límite de 0.6%. Previene la reacción álcali-agregado nociva.`)
  }

  const estado_eval = cumple_norma ? 'APTO' : 'NO APTO'
  const e = extras ?? {}

  const valores: { [k: string]: number | null | undefined } = {
    caco3, cao, mgo, sio2, fe2o3,
    p2o5, pb, cd, as_ppm,
    mgco3: Math.round(mgo * 2.0915 * 100) / 100,
    s: Math.round(so3 * 0.4005 * 1000) / 1000,
    caco3_eq: Math.round((caco3 + mgo * 2.478) * 100) / 100,
  }
  valores['pn'] = e.pn !== null && e.pn !== undefined ? e.pn : valores['caco3_eq']
  for (const k of ['blancura', 'tamano_particula', 'humedad', 'cao_disponible', 'cao_reactivo', 'resistencia', 'absorcion']) {
    valores[k] = e[k as keyof EnsayosOpcionales] ?? null
  }

  const dictamenes = evaluar_perfiles(valores)

  return {
    caco3, cao, mgo, sio2, fe2o3, al2o3, so3,
    na2o, k2o, p2o5, pb, cd, as_ppm,
    loi, res_insol, alcalis,
    lsf, sm, am, interp_sm, interp_am,
    c3s, c2s, c3a, c4af,
    advertencias_geol, interp_cesar,
    errores_norma, cumple_norma, estado_eval,
    dictamenes,
  }
}