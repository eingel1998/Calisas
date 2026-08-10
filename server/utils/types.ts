// Tipos compartidos del motor de evaluación geoquímica de calizas.
// Portados 1:1 del modelo Python (backend/calculos_calizas.py).

export interface EnsayosOpcionales {
  pn?: number | null
  blancura?: number | null
  tamano_particula?: number | null
  humedad?: number | null
  cao_disponible?: number | null
  cao_reactivo?: number | null
  resistencia?: number | null
  absorcion?: number | null
}

export interface DatosXRF {
  muestra_id: string
  caco3: number
  cao: number
  mgo: number
  sio2: number
  fe2o3: number
  al2o3: number
  so3: number
  na2o: number
  k2o: number
  pb: number
  cd: number
  as_ppm: number
}

export interface PerfilDictamen {
  nombre: string
  aplicacion: string
  norma: string
  estado: 'Apto' | 'No Apto' | 'Requiere ensayos'
  razon: string
}

export interface ResultadoEvaluacion {
  caco3: number
  cao: number
  mgo: number
  sio2: number
  fe2o3: number
  al2o3: number
  so3: number
  na2o: number
  k2o: number
  p2o5: number
  pb: number
  cd: number
  as_ppm: number
  loi: number
  res_insol: number
  alcalis: number
  lsf: number
  sm: number
  am: number
  interp_sm: string
  interp_am: string
  c3s: number
  c2s: number
  c3a: number
  c4af: number
  advertencias_geol: string[]
  interp_cesar: string[]
  errores_norma: string[]
  cumple_norma: boolean
  estado_eval: 'APTO' | 'NO APTO'
  dictamenes: PerfilDictamen[]
}

export interface MuestraDB {
  id_muestra: string
  caco3: number
  cao: number
  mgo: number
  sio2: number
  fe2o3: number
  al2o3: number
  so3: number
  na2o: number | null
  k2o: number | null
  p2o5: number | null
  pb: number | null
  cd: number | null
  as_ppm: number | null
  drx: string
  petrografia: string
  loi: number
  res_insol: number
  alcalis: number
  lsf: number
  sm: number
  am: number
  c3s: number
  c2s: number
  c3a: number
  c4af: number
  estado_eval: string
  archivo_fuente: string
  fecha_registro: string
  dictamenes_json: string
  pn: number | null
  blancura: number | null
  tamano_particula: number | null
  humedad: number | null
  cao_disponible: number | null
  cao_reactivo: number | null
  resistencia: number | null
  absorcion: number | null
  dictamenes?: PerfilDictamen[]
}