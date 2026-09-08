// Motor de evaluación geoquímica de calizas.
// Portado 1:1 de backend/calculos_calizas.py a TypeScript.
// MISMAS fórmulas, mismo orden de operaciones, mismos redondeos.

import type {
  DatosXRF,
  ElementoXRF,
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
  // Analitos secundarios: si el reporte no los trae, quedan null ("no medido"),
  // nunca 0 — un 0 falso haría pasar límites tipo Cd < 1 ppm sin haberlo medido.
  const pctOpt = (nombre: string): number | null => comp.has(nombre) ? pct(nombre) : null
  const ppmOpt = (nombre: string): number | null => comp.has(nombre) ? ppm(nombre) : null

  // ID de muestra. pdfjs suele emitir "M10 Sample ident" en una sola línea;
  // otros extractores ponen el ID en la línea previa o siguiente.
  let muestra_id = ''
  const raw = texto.split('\n').map((l) => l.trim())
  for (const linea of raw) {
    const m = linea.match(/^(.{1,30}?)\s+Sample ident$/)
    if (m && !m[1].includes('Sample results')) {
      muestra_id = m[1].trim()
      break
    }
  }
  for (let i = 0; muestra_id === '' && i < raw.length; i++) {
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

  const cao = pct('CaO'), mgo = pct('MgO'), sio2 = pct('SiO2')
  const fe2o3 = pct('Fe2O3'), al2o3 = pct('Al2O3'), k2o = pct('K2O')
  const so3 = pctOpt('SO3'), na2o = pctOpt('Na2O')

  // El XRF no reporta CaCO3: se deriva de CaO. Si el reporte viene calcinado
  // (óxidos normalizados a 100% sin LOI) hay que reconstruir el CO2 primero,
  // o CaO ~97% daría CaCO3 >100% y saturaría en el tope.
  const suma_ox = cao + mgo + sio2 + fe2o3 + al2o3 + (so3 ?? 0) + (na2o ?? 0) + k2o
  const f = suma_ox > 95.0 ? 100.0 / (100.0 + cao * 0.7848 + mgo * 1.0919) : 1.0

  return {
    muestra_id,
    // todos los compuestos del reporte, tal cual: los perfiles solo usan 8, pero
    // el resto (Ti, V, Cr, Mn, Zn, Zr, Sn, tierras raras…) queda registrado.
    elementos: [...comp.entries()].map(([nombre, [conc, unidad]]) => ({ nombre, conc, unidad })),
    caco3: Math.round(Math.min(cao * f * 1.7848, 100.0) * 100) / 100,
    cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o,
    p2o5: pctOpt('P2O5'),
    pb: ppmOpt('Pb'), cd: ppmOpt('Cd'), as_ppm: ppmOpt('As'),
  }
}

type ValoresNum = { [k: string]: number | null | undefined }

export function es_base_calcinada(datos: ValoresNum): boolean {
  return OXIDOS.reduce((s, k) => s + (datos[k] ?? 0.0), 0.0) > 95.0
}

export function convertir_base_seca(datos: ValoresNum, loi?: number): ValoresNum {
  let f: number
  if (loi) {
    f = (100.0 - loi) / 100.0
  } else {
    const co2 = (datos['cao'] ?? 0.0) * 0.7848 + (datos['mgo'] ?? 0.0) * 1.0919
    f = 100.0 / (100.0 + co2)
    loi = 100.0 * (1.0 - f)
  }

  const out: ValoresNum = { ...datos }
  for (const k of [...OXIDOS, 'p2o5', 'pb', 'cd', 'as_ppm']) {
    if (datos[k] === null || datos[k] === undefined) continue // no medido sigue no medido
    out[k] = Math.round((datos[k] as number) * f * 10000) / 10000
  }
  out['caco3'] = Math.round(Math.min((out['cao'] ?? 0.0) * 1.7848, 100.0) * 100) / 100
  out['loi_estimado'] = Math.round(loi * 100) / 100
  return out
}

export function validar_extraccion(datos: ValoresNum): string[] {
  const avisos: string[] = []
  const suma = OXIDOS.reduce((s, k) => s + (datos[k] ?? 0.0), 0.0)
  if (suma > 95.0) {
    avisos.push(`Los óxidos suman ${Math.round(suma * 10) / 10}%: el reporte viene normalizado a 100% sin LOI (base calcinada). Si necesita la base seca, active esa opción antes de extraer.`)
  }
  const noMedidos = ['so3', 'na2o', 'p2o5', 'pb', 'cd', 'as_ppm']
    .filter((k) => datos[k] === null || datos[k] === undefined)
    .map((k) => (k === 'as_ppm' ? 'As' : k.toUpperCase()))
  if (noMedidos.length) {
    avisos.push('No reportados por el laboratorio: ' + noMedidos.join(', ') + '. Los perfiles que dependen de ellos quedarán en "Requiere ensayos".')
  }
  const faltantes = OXIDOS.filter((k) => (datos[k] ?? 0.0) === 0.0 && datos[k] !== null && datos[k] !== undefined).map((k) => k.toUpperCase())
  if (faltantes.length) {
    avisos.push('Encontrados en 0 en el reporte: ' + faltantes.join(', ') + '.')
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

// `aprox` marca criterios cuyo valor es estimado, no medido: el dictamen sigue
// emitiéndose (es útil), pero baja la confianza y se declara la salvedad.
interface Criterio { campo: string; op: '>' | '<'; limite: number; etiqueta: string; aprox?: string }
interface Perfil {
  nombre: string
  aplicacion: string
  norma: string
  criterios: Criterio[]
  nota?: string
  // Limitación del método analítico disponible frente a lo que exige la norma.
  salvedad_metodo?: string
}

// Metales que responden al ensayo de sulfuros de las farmacopeas ("heavy
// metals", límite 20 ppm). El ensayo no es específico por elemento, así que la
// suma por XRF es una estimación: sirve para alertar, no para certificar.
const METALES_SULFURO = ['Pb', 'Hg', 'Bi', 'As', 'Sb', 'Sn', 'Cd', 'Ag', 'Cu', 'Mo', 'Te']

export function estimar_metales_pesados(elementos: ElementoXRF[], factor = 1.0): number | null {
  const presentes = elementos.filter((e) => METALES_SULFURO.includes(e.nombre))
  if (!presentes.length) return null
  const ppm = presentes.reduce((s, e) => s + (e.unidad === '%' ? e.conc * 10000 : e.conc), 0)
  return Math.round(ppm * factor * 100) / 100
}

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
    criterios: [
      { campo: 'caco3_eq', op: '>', limite: 80, etiqueta: 'CaCO3 equivalente > 80%' },
      { campo: 'pn', op: '>', limite: 80, etiqueta: 'Poder Neutralizante > 80%',
        aprox: 'PN estimado a partir del CaCO3 equivalente. NTC 5163 exige el ensayo de poder neutralizante; ingréselo en ensayos opcionales para un dictamen firme.' },
    ] },
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
    salvedad_metodo: 'Dictamen preliminar: se basa en XRF sin estándares (semicuantitativo). El Codex, la FCC y el Reglamento (UE) 231/2012 exigen ICP-MS para certificar grado alimentario. El fluoruro (≤0.005% FCC) no es medible por este XRF.',
    criterios: [
      { campo: 'caco3', op: '>', limite: 98.5, etiqueta: 'CaCO3 > 98.5%' },
      { campo: 'pb', op: '<', limite: 3, etiqueta: 'Pb < 3 ppm' },
      { campo: 'cd', op: '<', limite: 1, etiqueta: 'Cd < 1 ppm' },
      { campo: 'as_ppm', op: '<', limite: 3, etiqueta: 'As < 3 ppm' },
      { campo: 'metales_pesados', op: '<', limite: 20, etiqueta: 'Metales pesados totales < 20 ppm',
        aprox: 'Estimado sumando por XRF los metales que responden al ensayo de sulfuros (Pb, Sn, Te, As, Sb, Cd, Cu, Ag, Mo, Bi, Hg). El ensayo normativo no es específico por elemento y el XRF no detecta Hg: úselo como alerta, no como certificación.' },
    ] },
  { nombre: 'Industria farmacéutica', aplicacion: 'Excipiente y suplementos de calcio',
    norma: 'USP, Ph. Eur., BP',
    salvedad_metodo: 'Dictamen preliminar: se basa en XRF sin estándares (semicuantitativo). USP y Ph. Eur. exigen ICP-MS / análisis químico. Además, estas normas aplican al carbonato terminado (habitualmente precipitado y purificado), no a la caliza cruda: esto evalúa aptitud como materia prima.',
    // El Fe (Ph. Eur. ≤10 ppm sobre el producto terminado) no se usa como
    // criterio de rechazo: toda caliza natural lo supera y la purificación del
    // carbonato precipitado lo elimina. Se informa en la nota para no repetir
    // el error de aplicar límites del producto final a la roca cruda.
    nota: 'Referencia Ph. Eur. sobre el carbonato terminado: Fe ≤ 10 ppm. Una caliza natural lo supera siempre; se corrige en la purificación, por eso no se usa como criterio de rechazo aquí.',
    criterios: [
      { campo: 'caco3', op: '>', limite: 99, etiqueta: 'CaCO3 > 99%' },
      { campo: 'pb', op: '<', limite: 3, etiqueta: 'Pb < 3 ppm' },
      { campo: 'cd', op: '<', limite: 1, etiqueta: 'Cd < 1 ppm' },
      { campo: 'as_ppm', op: '<', limite: 4, etiqueta: 'As < 4 ppm (Ph. Eur.)' },
      { campo: 'metales_pesados', op: '<', limite: 20, etiqueta: 'Metales pesados totales < 20 ppm',
        aprox: 'Estimado sumando por XRF los metales que responden al ensayo de sulfuros. El ensayo normativo no es específico por elemento y el XRF no detecta Hg: úselo como alerta, no como certificación.' },
    ] },
]

// `estimados` = campos cuyo valor en esta muestra vino de una estimación y no de
// un ensayo. Si no se pasa, se asume que todo criterio con `aprox` lo está
// (conservador). Un campo medido de verdad no arrastra salvedad.
export function evaluar_perfiles(
  valores: { [k: string]: number | null | undefined },
  estimados?: Set<string>,
): PerfilDictamen[] {
  const resultados: PerfilDictamen[] = []
  for (const p of PERFILES_INDUSTRIALES) {
    const fallas: string[] = []
    const pendientes: string[] = []
    const salvedades: string[] = []
    for (const { campo, op, limite, etiqueta, aprox } of p.criterios) {
      const v = valores[campo]
      if (v === null || v === undefined) {
        pendientes.push(etiqueta)
        continue
      }
      // el criterio se evalúa aunque el valor sea estimado: se declara la salvedad
      const es_estimado = Boolean(aprox) && (estimados ? estimados.has(campo) : true)
      if (es_estimado) salvedades.push(`${etiqueta}: ${aprox}`)
      if (!(op === '>' ? v > limite : v < limite)) {
        fallas.push(`${etiqueta} — ${es_estimado ? 'estimado' : 'medido'}: ${v}`)
      }
    }
    let estado: PerfilDictamen['estado'], razon: string
    if (fallas.length) {
      estado = 'No Apto'
      razon = 'Incumple: ' + fallas.join('; ')
    } else if (pendientes.length) {
      estado = 'Requiere ensayos'
      razon = 'Química conforme en lo verificable. Falta medir: ' + pendientes.join('; ')
    } else {
      estado = 'Apto'
      razon = 'Cumple todos los criterios químicos.'
    }
    if (p.nota) razon += ` ${p.nota}`
    if (p.salvedad_metodo) salvedades.unshift(p.salvedad_metodo)

    const confianza: PerfilDictamen['confianza'] = p.salvedad_metodo
      ? 'Preliminar'
      : salvedades.length ? 'Media' : 'Alta'

    resultados.push({ nombre: p.nombre, aplicacion: p.aplicacion, norma: p.norma, estado, razon, confianza, salvedades })
  }
  return resultados
}

// null en so3/na2o/p2o5/pb/cd/as_ppm significa "no medido": no entra a fórmulas
// como 0 real y los perfiles que lo exigen quedan en "Requiere ensayos".
function optFloat(v: number | null | undefined): number | null {
  return v === null || v === undefined || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 100) / 100
}

export function calcular_evaluacion(
  caco3: number, cao: number, mgo: number, sio2: number, fe2o3: number, al2o3: number, so3: number | null,
  na2o: number | null = 0.0, k2o = 0.0, p2o5: number | null = 0.0, pb: number | null = 0.0, cd: number | null = 0.0, as_ppm: number | null = 0.0,
  petrografia = 'Micrítica de grano fino', guardar = true, loi = 0.0, res_insol = 0.0, alcalis = 0.0, extras: EnsayosOpcionales | null = null,
  elementos: ElementoXRF[] = [],
): ResultadoEvaluacion {
  caco3 = safeFloat(caco3); cao = safeFloat(cao); mgo = safeFloat(mgo)
  sio2 = safeFloat(sio2); fe2o3 = safeFloat(fe2o3); al2o3 = safeFloat(al2o3)
  k2o = safeFloat(k2o)
  const so3m = optFloat(so3), na2om = optFloat(na2o), p2o5m = optFloat(p2o5)
  const pbm = optFloat(pb), cdm = optFloat(cd), asm = optFloat(as_ppm)
  // valores numéricos para las fórmulas cementeras (Bogue, álcalis): no medido cuenta como 0
  const so3n = so3m ?? 0.0, na2on = na2om ?? 0.0

  // --- Base de cálculo ---
  // El XRF (Omnian) normaliza los óxidos a 100% SIN LOI: base calcinada. Los
  // criterios normativos de pureza (CaCO3, impurezas como % de la roca) exigen
  // la base carbonato, así que se reconstruye el CO2 de los carbonatos.
  // Los módulos cementeros (LSF, SM, AM, Bogue) NO se convierten: se calculan
  // sobre base calcinada (loss-free), que es la práctica en cemento.
  const suma_oxidos = cao + mgo + sio2 + fe2o3 + al2o3 + so3n + na2on + k2o
  const base_calcinada = suma_oxidos > 95.0
  let factor_base = 1.0
  if (base_calcinada) {
    const co2 = (cao * 0.7848) + (mgo * 1.0919)
    factor_base = 100.0 / (100.0 + co2)
  }
  const esc = (v: number) => Math.round(v * factor_base * 10000) / 10000
  const escOpt = (v: number | null) => (v === null ? null : Math.round(v * factor_base * 10000) / 10000)

  // Valores sobre base carbonato: lo que evalúan los 17 perfiles y las normas.
  const cao_ev = esc(cao), mgo_ev = esc(mgo), sio2_ev = esc(sio2)
  const fe2o3_ev = esc(fe2o3), al2o3_ev = esc(al2o3), k2o_ev = esc(k2o)
  const so3_ev = escOpt(so3m), na2o_ev = escOpt(na2om), p2o5_ev = escOpt(p2o5m)
  const pb_ev = escOpt(pbm), cd_ev = escOpt(cdm), as_ev = escOpt(asm)
  // CaCO3 derivado de CaO en la base correcta. Si el usuario aportó un CaCO3
  // medido (calcimetría/titulación) y la base no es calcinada, ese manda.
  const caco3_derivado = Math.round(Math.min(cao_ev * 1.7848, 100.0) * 100) / 100
  const caco3_ev = !base_calcinada && caco3 > 0 ? caco3 : caco3_derivado
  caco3 = caco3_ev

  if (guardar) {
    loi = Math.round(((cao_ev * 0.785) + (mgo_ev * 1.092)) * 100) / 100
    res_insol = Math.round(sio2_ev * 0.85 * 100) / 100
    alcalis = Math.round(((na2o_ev ?? 0.0) + (0.658 * k2o_ev)) * 1000) / 1000
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

  const c3s = Math.max(0.0, Math.round(((4.071 * cao) - (7.600 * sio2) - (6.718 * al2o3) - (1.430 * fe2o3) - (2.852 * so3n)) * 100) / 100)
  const c2s = Math.max(0.0, Math.round(((2.867 * sio2) - (0.7544 * c3s)) * 100) / 100)
  const c3a = Math.max(0.0, Math.round(((2.650 * al2o3) - (1.692 * fe2o3)) * 100) / 100)
  const c4af = Math.max(0.0, Math.round(3.043 * fe2o3 * 100) / 100)

  // Rangos de caliza como materia prima: se contrastan sobre base carbonato.
  const advertencias_geol: string[] = []
  if (caco3_ev < 75) advertencias_geol.push(`CaCO3 de ${caco3_ev}% está por debajo del recomendado (>75%).`)
  if (!(45 <= cao_ev && cao_ev <= 52)) advertencias_geol.push(`CaO de ${cao_ev}% está fuera del rango óptimo (45-52%).`)
  if (!(5 <= sio2_ev && sio2_ev <= 15)) advertencias_geol.push(`SiO2 de ${sio2_ev}% está fuera del rango recomendado (5-15%).`)
  if (!(1 <= fe2o3_ev && fe2o3_ev <= 5)) advertencias_geol.push(`Fe2O3 de ${fe2o3_ev}% está fuera del rango recomendado (1-5%).`)
  if (!(1 <= al2o3_ev && al2o3_ev <= 6)) advertencias_geol.push(`Al2O3 de ${al2o3_ev}% está fuera del rango recomendado (1-6%).`)

  const interp_cesar: string[] = []
  if (cao_ev >= 45.0 && sio2_ev <= 15.0 && mgo_ev <= 5.0) interp_cesar.push('✅ Depósito Favorable: Alto CaO, baja sílice y bajo MgO.')
  if (mgo_ev > 5.0) interp_cesar.push('⚠️ Problemático - Dolomitización: Presencia de MgO alto.')
  if (sio2_ev > 15.0 && al2o3_ev > 6.0) interp_cesar.push('⚠️ Problemático - Intercalaciones arcillosas: Niveles altos de SiO2 y Al2O3.')
  else if (sio2_ev > 15.0 && al2o3_ev <= 6.0) interp_cesar.push('⚠️ Problemático - Chert: Sílice excesiva.')
  if (!interp_cesar.length) interp_cesar.push('ℹ️ Condiciones geológicas intermedias u ordinarias.')

  // Veredicto: aptitud de la CALIZA como materia prima de clinker
  // (ASTM C150 / NTC 321 vía la matriz industrial). Los límites de LOI, residuo
  // insoluble y álcalis de ASTM C150 aplican al CEMENTO terminado, no a la
  // caliza — una caliza tiene LOI ~43% por su CO2 y los reprobaría siempre.
  // Se conservan como referencia informativa del producto resultante.
  const errores_norma: string[] = []
  if (caco3_ev < 75.0) errores_norma.push(`CaCO3 (${caco3_ev}%): Por debajo del mínimo de 75% exigido para clinker.`)
  if (cao_ev < 42.0) errores_norma.push(`CaO (${cao_ev}%): Por debajo del mínimo de 42%.`)
  if (mgo_ev > 5.0) errores_norma.push(`MgO (${mgo_ev}%): Supera el límite de 5.0%. Riesgo de expansión por periclasa en el cemento endurecido.`)
  if (sio2_ev > 15.0) errores_norma.push(`SiO2 (${sio2_ev}%): Supera el límite de 15%.`)
  if (fe2o3_ev > 5.0) errores_norma.push(`Fe2O3 (${fe2o3_ev}%): Supera el límite de 5%.`)
  const cumple_norma = errores_norma.length === 0

  if (so3m === null) {
    advertencias_geol.push('SO3 no fue reportado por el laboratorio: los controles de fraguado quedan sin verificar.')
  } else if (so3_ev !== null && so3_ev > 3.5) {
    advertencias_geol.push(`SO3 (${so3_ev}%) supera el 3.5% que ASTM C150 admite en el cemento terminado: vigilar el aporte de azufre.`)
  }
  advertencias_geol.push(`Referencia sobre el cemento resultante (ASTM C150): LOI ${loi}%, residuo insoluble ${res_insol}%, álcalis ${alcalis}%. Estos límites aplican al cemento terminado, no a la caliza cruda.`)

  const estado_eval = cumple_norma ? 'APTO' : 'NO APTO'
  const e = extras ?? {}

  const valores: { [k: string]: number | null | undefined } = {
    caco3: caco3_ev, cao: cao_ev, mgo: mgo_ev, sio2: sio2_ev, fe2o3: fe2o3_ev,
    p2o5: p2o5_ev, pb: pb_ev, cd: cd_ev, as_ppm: as_ev,
    mgco3: Math.round(mgo_ev * 2.0915 * 100) / 100,
    s: so3_ev === null ? null : Math.round(so3_ev * 0.4005 * 1000) / 1000,
    caco3_eq: Math.round((caco3_ev + mgo_ev * 2.478) * 100) / 100,
    // Fe elemental desde Fe2O3 (2 × 55.845 / 159.69), para el límite de Ph. Eur.
    fe_ppm: Math.round(fe2o3_ev * 0.6994 * 10000 * 100) / 100,
    metales_pesados: estimar_metales_pesados(elementos, factor_base),
  }
  valores['pn'] = e.pn !== null && e.pn !== undefined ? e.pn : valores['caco3_eq']
  for (const k of ['blancura', 'tamano_particula', 'humedad', 'cao_disponible', 'cao_reactivo', 'resistencia', 'absorcion']) {
    valores[k] = e[k as keyof EnsayosOpcionales] ?? null
  }

  // qué valores de ESTA muestra son estimados y no medidos
  const estimados = new Set<string>(['metales_pesados'])
  if (e.pn === null || e.pn === undefined) estimados.add('pn')

  const dictamenes = evaluar_perfiles(valores, estimados)

  return {
    // valores tal como se reportaron (los que muestra el formulario)
    caco3, cao, mgo, sio2, fe2o3, al2o3, so3: so3m,
    na2o: na2om, k2o, p2o5: p2o5m, pb: pbm, cd: cdm, as_ppm: asm,
    loi, res_insol, alcalis,
    lsf, sm, am, interp_sm, interp_am,
    c3s, c2s, c3a, c4af,
    advertencias_geol, interp_cesar,
    errores_norma, cumple_norma, estado_eval,
    dictamenes,
    // base usada para los criterios normativos, para poder auditar el dictamen
    base_calcinada, factor_base: Math.round(factor_base * 10000) / 10000,
    base_evaluacion: {
      caco3: caco3_ev, cao: cao_ev, mgo: mgo_ev, sio2: sio2_ev, fe2o3: fe2o3_ev,
      al2o3: al2o3_ev, so3: so3_ev, na2o: na2o_ev, k2o: k2o_ev, p2o5: p2o5_ev,
      pb: pb_ev, cd: cd_ev, as_ppm: as_ev,
    },
  }
}