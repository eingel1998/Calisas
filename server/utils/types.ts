export type Numero = number | null
export type BaseAnalitica = 'desconocida' | 'seca' | 'calcinada'
export type Procedencia = 'medido' | 'calculado' | 'estimado'
export interface DatoOriginal { compuesto: string; texto: string; unidad: string; valor: Numero }
export interface ContextoAnalisis {
  base: BaseAnalitica
  base_trazas: BaseAnalitica
  convertir: boolean
  estimar_loi: boolean
  loi: Numero
  originales: DatoOriginal[]
  metadatos: Record<string, string>
  texto_reporte: string
  procedencia: Record<string, Procedencia>
  entrada?: Record<string, Numero>
  usados?: Record<string, Numero>
}
export interface EnsayosOpcionales {
  pn?: Numero; blancura?: Numero; tamano_particula?: Numero; humedad?: Numero
  cao_disponible?: Numero; cao_reactivo?: Numero; resistencia?: Numero; absorcion?: Numero
}
export type Composicion = Record<'caco3' | 'cao' | 'mgo' | 'sio2' | 'fe2o3' | 'al2o3' | 'so3' | 'na2o' | 'k2o' | 'p2o5' | 'pb' | 'cd' | 'as_ppm', Numero>
export type DatosXRF = Composicion & { muestra_id: string; originales: DatoOriginal[]; metadatos: Record<string, string>; texto_reporte: string }
export interface CriterioDictamen {
  campo: string; etiqueta: string; valor: Numero; unidad: string
  op: '>' | '<'; limite: number; estado: 'Cumple' | 'Incumple' | 'Pendiente'
  procedencia: Procedencia | null
}
export interface PerfilDictamen {
  nombre: string; aplicacion: string; norma: string
  estado: 'Apto' | 'No Apto' | 'Requiere ensayos'
  razon: string
  criterios: CriterioDictamen[]
  pendientes: string[]
  observaciones: string[]
}
export interface ResumenUsos { aptos: number; no_aptos: number; pendientes: number }
export type ResultadoEvaluacion = Composicion & {
  loi: Numero; res_insol: Numero; alcalis: Numero; lsf: Numero; sm: Numero; am: Numero
  c3s: Numero; c2s: Numero; c3a: Numero; c4af: Numero
  advertencias_geol: string[]; interp_cesar: string[]; interp_sm: string; interp_am: string
  errores_norma: string[]; cumple_norma: null; estado_eval: null
  dictamenes: PerfilDictamen[]; resumen: ResumenUsos | null
  contexto: ContextoAnalisis; version_evaluacion: 2
}
export type MuestraDB = Partial<ResultadoEvaluacion> & {
  id_muestra: string; drx: string | null; petrografia: string | null
  archivo_fuente: string; fecha_registro: string; dictamenes_json: string
}
