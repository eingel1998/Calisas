// Motor único: valores originales, conversiones explícitas y dictámenes por uso.
import type { Composicion, DatosXRF, DatoOriginal, Numero, ContextoAnalisis, Procedencia, PerfilDictamen, ResumenUsos, ResultadoEvaluacion, EnsayosOpcionales } from './types'

export const OXIDOS = ['cao','mgo','sio2','fe2o3','al2o3','so3','na2o','k2o','p2o5'] as const
export const CAMPOS = ['caco3', ...OXIDOS, 'pb','cd','as_ppm'] as const
export const EXTRAS = ['pn','blancura','tamano_particula','humedad','cao_disponible','cao_reactivo','resistencia','absorcion'] as const
const COMPUESTOS: Record<string, string> = { caco3:'CaCO3',cao:'CaO',mgo:'MgO',sio2:'SiO2',fe2o3:'Fe2O3',al2o3:'Al2O3',so3:'SO3',na2o:'Na2O',k2o:'K2O',p2o5:'P2O5',pb:'Pb',cd:'Cd',as_ppm:'As' }
const esTraza = (k: string) => ['pb','cd','as_ppm'].includes(k)

export function errorValidacion(message: string): never {
  throw Object.assign(new Error(message), { statusCode: 400 })
}
export function validar_numero(v: unknown, campo: string, maximo = Infinity): Numero {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return null
  if (typeof v !== 'number' && typeof v !== 'string') errorValidacion(`${campo}: número inválido`)
  const s = String(v).trim().replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) errorValidacion(`${campo}: número inválido`)
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0 || n > maximo) errorValidacion(`${campo}: fuera de rango (0–${maximo})`)
  return n
}

function metadatos_reporte(texto: string): Record<string,string> {
  const etiquetas: Record<string,string> = {
    'Application':'Aplicación', 'Sequence':'Secuencia', 'Position':'Posición',
    'Measurement time':'Fecha de medición', 'Initial weight':'Peso inicial (tal como se informa)',
    'Final weight':'Peso final (tal como se informa)', 'Normalisation factor':'Factor de normalización',
    'Minimum He Flow (l/min)':'Flujo mínimo de He (l/min)',
  }
  const metadatos: Record<string,string>={}
  const lineas=texto.split('\n').map(l=>l.trim())
  const fecha=lineas.find(l=>l.includes('Sample results'))?.match(/^(.*?)\s+Page\s*\d+/)?.[1]
  if(fecha) metadatos['Fecha del informe']=fecha
  for(const [campo,etiqueta] of Object.entries(etiquetas)) {
    const i=lineas.findIndex(l=>l.startsWith(campo))
    if(i>=0) {
      const valor=lineas[i].slice(campo.length).trim() || lineas[i+1]
      if(valor) metadatos[etiqueta]=valor
    }
  }
  return metadatos
}

export function parsear_reporte_xrf(texto: string): DatosXRF | null {
  const comp = new Map<string, DatoOriginal>()
  const raw = texto.split('\n').map(l => l.trim())
  const lineas = raw.map(l => l.split(/\s+/).filter(Boolean))
  for (let i=0; i<lineas.length; i++) {
    if (lineas[i][0] !== 'Compound') continue
    const nombres = lineas[i].slice(1)
    const siguientes = lineas.slice(i+1,i+4)
    const conc = siguientes.find(l=>l[0]==='Conc')?.slice(1)
    const unidades = siguientes.find(l=>l[0]==='Unit')?.slice(1)
    if (!conc || !unidades || nombres.length!==conc.length || nombres.length!==unidades.length) errorValidacion('Tabla incompleta: no coinciden compuestos, concentraciones y unidades.')
    nombres.forEach((nombre,j) => {
      const unidad = unidades[j]
      if (!['%','ppm'].includes(unidad)) errorValidacion(`${nombre}: unidad no compatible (${unidad})`)
      const texto = conc[j]
      const valor = /^[<>≤≥]/.test(texto) ? null : validar_numero(texto,nombre,unidad==='%'?100:1e6)
      const anterior = comp.get(nombre)
      if (anterior && (anterior.texto!==texto || anterior.unidad!==unidad)) errorValidacion(`${nombre}: resultados duplicados contradictorios`)
      comp.set(nombre,{compuesto:nombre,texto,unidad,valor})
    })
  }
  if (![...comp.values()].some(d=>d.valor!=null)) return null
  const datos = Object.fromEntries(CAMPOS.map(k=> {
    const d=comp.get(COMPUESTOS[k])
    return [k,d?.valor==null?null:d.valor*(esTraza(k)?(d.unidad==='%'?10000:1):(d.unidad==='ppm'?1/10000:1))]
  })) as Composicion
  const idx=raw.indexOf('Sample ident')
  const inline = raw.find(l=>/\s+Sample ident$/.test(l))
  const muestra_id = inline ? inline.replace(/\s+Sample ident$/, '').trim() : idx>0 && !raw[idx-1].includes('Sample results') ? raw[idx-1] : ''
  const originales=[...comp.values()]
  const elementos=originales.map(d=>({nombre:d.compuesto,conc:d.valor,unidad:d.unidad}))
  return {...datos,muestra_id,originales,elementos,metadatos:metadatos_reporte(texto),texto_reporte:texto}
}

// Los reportes normalizados del laboratorio suman cerca de 100 y requieren llevarse a base seca.
export function es_base_calcinada(datos: Partial<Composicion>): boolean {
  return OXIDOS.reduce((s,k)=>s+(datos[k]??0),0)>95
}
export function convertir_base_seca(datos: Partial<Composicion>, loi?: Numero, convertirTrazas=false): Record<string, Numero> {
  if (loi==null) {
    if (datos.cao==null || datos.mgo==null) errorValidacion('Faltan CaO y MgO para estimar LOI.')
    const co2=datos.cao*0.7848+datos.mgo*1.0919
    loi=100*(1-100/(100+co2))
  }
  loi=validar_numero(loi,'LOI',100)!
  const factor=(100-loi)/100
  const out = Object.fromEntries(CAMPOS.map(k=>[k,datos[k]??null])) as Record<string,Numero>
  for (const k of ['caco3',...OXIDOS,...(convertirTrazas?['pb','cd','as_ppm']:[])]) out[k]=datos[k]==null?null:datos[k]!*factor
  // Si no se midió carbonato, la conversión solo ofrece una estimación explícita.
  if (out.caco3==null && out.cao!=null) out.caco3=out.cao*1.7848<=100?out.cao*1.7848:null
  out.loi=loi
  out.loi_estimado=loi
  return out
}
export function validar_extraccion(datos: Partial<Composicion>): string[] {
  const avisos: string[]=[]
  if (es_base_calcinada(datos)) avisos.push('Suma de óxidos superior al 95%: se aplicará conversión estimada a base seca. Puede reemplazarla indicando la base y el LOI medido.')
  const faltantes=CAMPOS.filter(k=>datos[k]==null).map(k=>COMPUESTOS[k])
  if (faltantes.length) avisos.push('Sin medición disponible: '+faltantes.join(', ')+'. No se sustituyen por cero.')
  return avisos
}
// --- Matriz de usos industriales de caliza (17 perfiles) ---

interface Criterio { campo: string; op: '>' | '<'; limite: number; etiqueta: string }
interface Perfil { nombre: string; aplicacion: string; norma: string; criterios: Criterio[]; nota?: string }

export const PERFILES_INDUSTRIALES: Perfil[] = [
  { nombre: 'Industria cementera', aplicacion: 'Fabricación de clinker y cemento Portland',
    norma: 'ASTM C150, ASTM C114, NTC 121, NTC 321',
    criterios: [['caco3', '>', 75, 'CaCO₃ > 75%'], ['cao', '>', 42, 'CaO > 42%'],
      ['mgo', '<', 5, 'MgO < 5%'], ['sio2', '<', 15, 'SiO₂ < 15%'],
      ['fe2o3', '<', 5, 'Fe₂O₃ < 5%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Producción de cal viva', aplicacion: 'Obtención de CaO mediante calcinación',
    norma: 'ASTM C25, ASTM C51, ASTM C911',
    criterios: [['caco3', '>', 95, 'CaCO₃ > 95%'], ['sio2', '<', 2, 'SiO₂ < 2%'],
      ['mgco3', '<', 5, 'MgCO₃ < 5%'], ['fe2o3', '<', 1, 'Fe₂O₃ < 1%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Producción de cal hidratada', aplicacion: 'Producción de Ca(OH)₂',
    norma: 'ASTM C206, ASTM C207, ASTM C911',
    criterios: [['cao_disponible', '>', 90, 'CaO disponible > 90%'], ['mgo', '<', 3, 'MgO < 3%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Cal agrícola', aplicacion: 'Neutralización de suelos ácidos',
    norma: 'NTC 5163, ASTM C602',
    criterios: [['caco3_eq', '>', 80, 'CaCO₃ equivalente > 80%'], ['pn', '>', 80, 'Poder Neutralizante > 80%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria siderúrgica', aplicacion: 'Fundente en altos hornos',
    norma: 'ISO 12677, ASTM E1915',
    criterios: [['caco3', '>', 90, 'CaCO₃ > 90%'], ['sio2', '<', 2, 'SiO₂ < 2%'],
      ['p2o5', '<', 0.05, 'P₂O₅ < 0.05%'], ['s', '<', 0.03, 'S < 0.03%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria química', aplicacion: 'Carbonato de calcio precipitado y otros compuestos',
    norma: 'ASTM C602, ISO 3262',
    criterios: [['caco3', '>', 98, 'CaCO₃ > 98%'], ['fe2o3', '<', 0.05, 'Fe₂O₃ < 0.05%'],
      ['mgo', '<', 1, 'MgO < 1%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria del vidrio', aplicacion: 'Fabricación de vidrio',
    norma: 'ASTM C146, ISO 1288',
    criterios: [['caco3', '>', 95, 'CaCO₃ > 95%'], ['fe2o3', '<', 0.05, 'Fe₂O₃ < 0.05%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria cerámica', aplicacion: 'Producción de cerámica y porcelana',
    norma: 'ISO 13006, ASTM C373',
    criterios: [['caco3', '>', 90, 'CaCO₃ > 90%'], ['fe2o3', '<', 0.5, 'Fe₂O₃ < 0.5%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria del papel', aplicacion: 'Carga mineral y recubrimiento',
    norma: 'ISO 2469, ISO 2470',
    criterios: [['caco3', '>', 98, 'CaCO₃ > 98%'], ['blancura', '>', 95, 'Blancura > 95%'],
      ['tamano_particula', '<', 2, 'Tamaño de partícula < 2 µm']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria de pinturas', aplicacion: 'Pigmento y carga mineral',
    norma: 'ISO 3262-2, ASTM D1199',
    criterios: [['caco3', '>', 98, 'CaCO₃ > 98%'], ['fe2o3', '<', 0.1, 'Fe₂O₃ < 0.1%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })),
    nota: 'Validar granulometría muy fina.' },
  { nombre: 'Industria del plástico', aplicacion: 'Carga mineral para polímeros',
    norma: 'ISO 3262, ASTM D5630',
    criterios: [['caco3', '>', 98, 'CaCO₃ > 98%'], ['humedad', '<', 0.2, 'Humedad < 0.2%'],
      ['tamano_particula', '<', 5, 'Tamaño de partícula < 5 µm']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria del caucho', aplicacion: 'Material de relleno',
    norma: 'ASTM D1193, ISO 3262',
    criterios: [['caco3', '>', 97, 'CaCO₃ > 97%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })),
    nota: 'Validar granulometría ultrafina.' },
  { nombre: 'Tratamiento de aguas', aplicacion: 'Neutralización y control del pH',
    norma: 'AWWA B202, ASTM C25',
    criterios: [['caco3', '>', 90, 'CaCO₃ > 90%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })),
    nota: 'Requiere elevada reactividad / velocidad de disolución.' },
  { nombre: 'Protección ambiental', aplicacion: 'Neutralización de drenajes ácidos y desulfurización',
    norma: 'EPA Method 3052, ASTM C25',
    criterios: [['caco3', '>', 90, 'CaCO₃ > 90%'], ['cao_reactivo', '>', 85, 'CaO reactivo > 85%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Material de construcción', aplicacion: 'Agregados, roca ornamental y afirmados',
    norma: 'ASTM C568, ASTM C97, ASTM C170, NTC 174',
    criterios: [['resistencia', '>', 50, 'Resistencia a compresión > 50 MPa'],
      ['absorcion', '<', 5, 'Absorción < 5%']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria alimentaria', aplicacion: 'Aditivo alimentario (E170)',
    norma: 'Codex Alimentarius, FCC, Reglamento (UE) 231/2012',
    criterios: [['caco3', '>', 98.5, 'CaCO₃ > 98.5%'], ['pb', '<', 3, 'Pb < 3 ppm'],
      ['cd', '<', 1, 'Cd < 1 ppm'], ['as_ppm', '<', 3, 'As < 3 ppm']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
  { nombre: 'Industria farmacéutica', aplicacion: 'Excipiente y suplementos de calcio',
    norma: 'USP, Ph. Eur., BP',
    criterios: [['caco3', '>', 99, 'CaCO₃ > 99%'], ['pb', '<', 3, 'Pb < 3 ppm'],
      ['cd', '<', 1, 'Cd < 1 ppm'], ['as_ppm', '<', 3, 'As < 3 ppm']].map((c) => ({ campo: String(c[0]), op: c[1] as '>' | '<', limite: Number(c[2]), etiqueta: String(c[3]) })) },
]


// Recomendaciones descriptivas de la matriz. Informan, pero no bloquean el
// resultado porque la tabla no define un umbral comprobable para ellas.
const OBSERVACIONES: Record<string,string[]> = {
  'Industria cementera':['Verificar homogeneidad química y mineralógica mediante DRX/petrografía.'],
  'Producción de cal viva':['Verificar reactividad y porosidad.'],
  'Producción de cal hidratada':['Verificar reactividad.'],
  'Cal agrícola':['Verificar granulometría para uso agrícola.'],
  'Industria siderúrgica':['Verificar mineralogía por DRX.'],
  'Industria química':['Verificar blancura para el uso químico.'],
  'Industria cerámica':['Verificar estabilidad mineralógica por DRX.'],
  'Industria de pinturas':['Verificar color y granulometría muy fina.'],
  'Industria del caucho':['Verificar blancura y granulometría ultrafina.'],
  'Tratamiento de aguas':['Verificar reactividad y velocidad de disolución.'],
  'Protección ambiental':['Verificar reactividad química.'],
  'Industria alimentaria':['Verificar requisitos de grado alimenticio; la matriz no certifica ausencia de todos los metales pesados.'],
  'Industria farmacéutica':['Verificar requisitos de grado farmacéutico; la matriz no certifica ausencia de todos los metales pesados.'],
}
const unidadCampo = (k: string) => esTraza(k)?'ppm':k==='resistencia'?'MPa':k==='tamano_particula'?'µm':'%'

export function evaluar_perfiles(valores: Record<string,Numero|undefined>, impedimentos: Record<string,string>={}, procedencia: Record<string,Procedencia>={}): PerfilDictamen[] {
  return PERFILES_INDUSTRIALES.map(p=> {
    const fallas: string[]=[]
    const pendientes: string[]=[]
    const observaciones=[...(OBSERVACIONES[p.nombre]??[]),...(p.nota?[p.nota]:[])]
    const criterios=p.criterios.map(({campo,op,limite,etiqueta})=> {
      const valor=valores[campo]??null
      const motivo=impedimentos[campo] || (valor==null?'Sin dato':!Number.isFinite(valor)?'Valor inválido':null)
      const estado = motivo?'Pendiente':(op==='>'?valor!>limite:valor!<limite)?'Cumple':'Incumple'
      if (motivo) pendientes.push(`${etiqueta}: ${motivo}`)
      if (estado==='Incumple') fallas.push(`${etiqueta}; valor: ${valor} ${unidadCampo(campo)}`)
      return {campo,op,limite,etiqueta,valor,unidad:unidadCampo(campo),estado,procedencia:valor==null?null:(procedencia[campo]??'medido')} as PerfilDictamen['criterios'][number]
    })
    const estado: PerfilDictamen['estado']=fallas.length?'No Apto':pendientes.length?'Requiere ensayos':'Apto'
    const razon=[fallas.length?'Incumple: '+fallas.join('; '):'',pendientes.length?'Pendiente: '+pendientes.join('; '):'',!fallas.length&&!pendientes.length?'Cumple los criterios configurados.':''].filter(Boolean).join(' ')
    return {nombre:p.nombre,aplicacion:p.aplicacion,norma:p.norma,estado,razon,criterios,pendientes,observaciones}
  })
}

export function resumir_dictamenes(ds: PerfilDictamen[] | null | undefined): ResumenUsos | null {
  if (!Array.isArray(ds) || ds.length!==PERFILES_INDUSTRIALES.length) return null
  if (new Set(ds.map(d=>d?.nombre)).size!==17) return null
  if (ds.some(d=>!d || !PERFILES_INDUSTRIALES.some(p=>p.nombre===d.nombre) || !['Apto','No Apto','Requiere ensayos'].includes(d.estado))) return null
  return {aptos:ds.filter(d=>d.estado==='Apto').length,no_aptos:ds.filter(d=>d.estado==='No Apto').length,pendientes:ds.filter(d=>d.estado==='Requiere ensayos').length}
}

// Una misma entrada y contexto se usan para PDF, manual y lote.
export function evaluar_muestra(req: Record<string,any>) {
  if (!req || typeof req!=='object' || Array.isArray(req)) errorValidacion('Solicitud inválida')
  if (typeof req.id_muestra!=='string' || !req.id_muestra.trim()) errorValidacion('ID de muestra obligatorio')
  const datos=Object.fromEntries(CAMPOS.map(k=>[k,validar_numero(req[k],COMPUESTOS[k],esTraza(k)?1e6:100)])) as Composicion
  if (req.extras!=null && (typeof req.extras!=='object'||Array.isArray(req.extras))) errorValidacion('Ensayos inválidos')
  const extras=Object.fromEntries(EXTRAS.map(k=>[k,validar_numero(req.extras?.[k],k,['tamano_particula','resistencia','pn'].includes(k)?Infinity:100)])) as EnsayosOpcionales
  const entrada={...datos}
  const c=req.contexto??{}
  if (typeof c!=='object' || Array.isArray(c)) errorValidacion('Contexto de análisis inválido')
  if (req.version_evaluacion!=null || c.usados!=null) errorValidacion('La muestra ya fue evaluada. Envíe los datos originales para evitar una segunda conversión.')
  for (const k of ['base','base_trazas']) if(c[k]!=null&&!['desconocida','seca','calcinada'].includes(c[k])) errorValidacion(`${k}: base inválida`)
  for (const k of ['convertir','estimar_loi']) if(c[k]!=null&&typeof c[k]!=='boolean') errorValidacion(`${k}: opción inválida`)
  const procedencia: Record<string,Procedencia>={}
  for (const [k,v] of Object.entries({...datos,...extras})) if(v!=null) procedencia[k]='medido'
  const originalesRaw=c.originales??req.originales
  if (originalesRaw!=null && !Array.isArray(originalesRaw)) errorValidacion('Tabla original inválida')
  const originales: DatoOriginal[]=(originalesRaw?.length ? originalesRaw : undefined)?.map((d:any)=> {
    if (!d || typeof d.compuesto!=='string' || typeof d.texto!=='string' || !['%','ppm'].includes(d.unidad)) errorValidacion('Dato original inválido')
    return {compuesto:d.compuesto,texto:d.texto,unidad:d.unidad,valor:/^[<>≤≥]/.test(d.texto)?null:validar_numero(d.texto,d.compuesto,d.unidad==='%'?100:1e6)}
  }) ?? CAMPOS.filter(k=>datos[k]!=null).map(k=>({compuesto:COMPUESTOS[k],texto:String(datos[k]),unidad:unidadCampo(k),valor:datos[k]}))
  const texto_reporte=c.texto_reporte??req.texto_reporte??''
  if(typeof texto_reporte!=='string'||texto_reporte.length>1_000_000) errorValidacion('Texto del informe inválido o demasiado extenso.')
  const probableCalcinada=es_base_calcinada(datos)
  const base=c.base && c.base!=='desconocida' ? c.base : probableCalcinada?'calcinada':'seca'
  const base_trazas=c.base_trazas && c.base_trazas!=='desconocida' ? c.base_trazas : base
  const loiEntrada=validar_numero(c.loi??req.loi,'LOI',100)
  const conversionAutomatica=probableCalcinada && c.base!=='seca'
  const contexto:ContextoAnalisis={
    base,base_trazas,
    convertir:c.convertir===true || conversionAutomatica,
    estimar_loi:c.estimar_loi===true || (conversionAutomatica && loiEntrada==null),
    loi:loiEntrada,originales,metadatos:metadatos_reporte(texto_reporte),texto_reporte,procedencia,entrada,
  }
  let loi=contexto.loi
  if(loi!=null) procedencia.loi='medido'
  const impedimentos: Record<string,string>={}
  const avisos=validar_extraccion(datos)
  if(contexto.convertir && contexto.base!=='calcinada') errorValidacion('Confirme base calcinada para convertir.')
  if(contexto.estimar_loi && !contexto.convertir) errorValidacion('La estimación de LOI requiere conversión explícita.')
  if(contexto.convertir) {
    if(loi==null&&!contexto.estimar_loi) errorValidacion('Indique LOI medido o seleccione su estimación explícita.')
    const estimado=loi==null
    const convertido=convertir_base_seca(datos,loi,contexto.base_trazas==='calcinada')
    for (const k of CAMPOS) {
      if(convertido[k]!==datos[k]) procedencia[k]=estimado?'estimado':'calculado'
      datos[k]=convertido[k]
    }
    // Carbonato deducido del óxido presupone su asociación mineralógica.
    if(entrada.caco3==null&&datos.caco3!=null) procedencia.caco3='estimado'
    loi=convertido.loi
    procedencia.loi=estimado?'estimado':'medido'
    if(entrada.caco3==null&&datos.caco3==null&&datos.cao!=null) avisos.push('CaCO₃ calculado fuera de 0–100%: no se utiliza. Revise la base y los supuestos de conversión.')
  }
  if(contexto.base==='calcinada'&&!contexto.convertir) {
    for (const k of ['caco3',...OXIDOS,'mgco3','s','caco3_eq']) impedimentos[k]='Base de comparación sin confirmar o sin convertir a seca'
  }
  for (const k of ['pb','cd','as_ppm']) if(contexto.base_trazas==='calcinada'&&!contexto.convertir) impedimentos[k]='Base de trazas sin convertir'
  const derivar=(claves:string[],f:(...v:number[])=>number):Numero=>claves.some(k=>datos[k]==null)?null:f(...claves.map(k=>datos[k]!))
  const valores: Record<string,Numero|undefined>={...datos,...extras,
    mgco3:derivar(['mgo'],v=>v*2.0915),
    s:derivar(['so3'],v=>v*0.4005),
    caco3_eq:derivar(['caco3','mgo'],(ca,mg)=>ca+mg*2.478),
  }
  for(const k of ['mgco3','s','caco3_eq']) if(valores[k]!=null) procedencia[k]='estimado'
  const alcalis=derivar(['na2o','k2o'],(na,k)=>na+0.658*k)
  if(alcalis!=null) procedencia.alcalis='calculado'
  const denomLSF=derivar(['sio2','al2o3','fe2o3'],(si,al,fe)=>2.8*si+1.2*al+0.65*fe)
  const denomSM=derivar(['al2o3','fe2o3'],(al,fe)=>al+fe)
  const lsf=denomLSF&&datos.cao!=null?datos.cao/denomLSF:null
  const sm=denomSM&&datos.sio2!=null?datos.sio2/denomSM:null
  const am=datos.fe2o3&&datos.al2o3!=null?datos.al2o3/datos.fe2o3:null
  contexto.loi=loi
  contexto.usados={...datos,loi,alcalis,...extras}
  const dictamenes=evaluar_perfiles(valores,impedimentos,procedencia)
  const resultado:ResultadoEvaluacion={...datos,loi,res_insol:null,alcalis,lsf,sm,am,c3s:null,c2s:null,c3a:null,c4af:null,
    advertencias_geol:avisos,interp_cesar:[],interp_sm:'Relación calculada; no certifica aptitud de la roca.',interp_am:'Relación calculada; no certifica aptitud de la roca.',
    errores_norma:[],cumple_norma:null,estado_eval:null,dictamenes,resumen:resumir_dictamenes(dictamenes),contexto,version_evaluacion:2}
  for (const campo of ['coordenadas_muestreo', 'direccion_muestreo']) if (req[campo] != null && (typeof req[campo] !== 'string' || req[campo].length > 500)) errorValidacion(`${campo}: texto inválido o demasiado largo`)
  return {...resultado,id_muestra:req.id_muestra.trim(),drx:typeof req.drx==='string'?req.drx.trim()||null:null,petrografia:typeof req.petrografia==='string'?req.petrografia.trim()||null:null,
    coordenadas_muestreo:req.coordenadas_muestreo?.trim()||null,direccion_muestreo:req.direccion_muestreo?.trim()||null,
    archivo_fuente:typeof req.archivo_fuente==='string'?req.archivo_fuente:'Manual',fecha_registro:new Date().toISOString(),extras}
}

// Compatibilidad de llamadas internas; no infiere una base ni mediciones ausentes.
export function calcular_evaluacion(caco3:Numero,cao:Numero,mgo:Numero,sio2:Numero,fe2o3:Numero,al2o3:Numero,so3:Numero,na2o:Numero=null,k2o:Numero=null,p2o5:Numero=null,pb:Numero=null,cd:Numero=null,as_ppm:Numero=null,petrografia='',_guardar=true,loi:Numero=null,_res_insol:Numero=null,_alcalis:Numero=null,extras:EnsayosOpcionales|null=null,contexto:Partial<ContextoAnalisis>={}):ResultadoEvaluacion {
  return evaluar_muestra({id_muestra:'Interna',caco3,cao,mgo,sio2,fe2o3,al2o3,so3,na2o,k2o,p2o5,pb,cd,as_ppm,petrografia,extras,contexto:{...contexto,loi:contexto.loi??loi}})
}
