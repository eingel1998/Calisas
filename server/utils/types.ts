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

// Cada compuesto del reporte tal como lo emitió el equipo, sin conversiones.
// Se guarda completo aunque los perfiles no lo usen: es dato de laboratorio.
export interface ElementoXRF {
  nombre: string
  conc: number
  unidad: string
}

// null = analito no reportado por el laboratorio ("no medido" ≠ 0).
export interface DatosXRF {
  muestra_id: string
  elementos: ElementoXRF[]
  caco3: number
  cao: number
  mgo: number
  sio2: number
  fe2o3: number
  al2o3: number
  so3: number | null
  na2o: number | null
  k2o: number
  p2o5: number | null
  pb: number | null
  cd: number | null
  as_ppm: number | null
}

export interface PerfilDictamen {
  nombre: string
  aplicacion: string
  norma: string
  estado: 'Apto' | 'No Apto' | 'Requiere ensayos'
  razon: string
  // Qué tan respaldado está el dictamen:
  //  Alta       — todos los criterios con medición directa y método aceptado
  //  Media      — algún valor es estimado a partir de otro (se detalla en salvedades)
  //  Preliminar — el método disponible no basta para certificar (p. ej. la norma pide ICP-MS)
  confianza: 'Alta' | 'Media' | 'Preliminar'
  salvedades: string[]
}

export interface ResultadoEvaluacion {
  caco3: number
  cao: number
  mgo: number
  sio2: number
  fe2o3: number
  al2o3: number
  so3: number | null
  na2o: number | null
  k2o: number
  p2o5: number | null
  pb: number | null
  cd: number | null
  as_ppm: number | null
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
  // Base sobre la que se contrastaron los criterios normativos. Si el reporte
  // viene calcinado (óxidos normalizados a 100% sin LOI), los perfiles se
  // evalúan sobre base carbonato: factor_base < 1 y base_evaluacion la refleja.
  base_calcinada: boolean
  factor_base: number
  base_evaluacion: {
    caco3: number
    cao: number
    mgo: number
    sio2: number
    fe2o3: number
    al2o3: number
    so3: number | null
    na2o: number | null
    k2o: number
    p2o5: number | null
    pb: number | null
    cd: number | null
    as_ppm: number | null
  }
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