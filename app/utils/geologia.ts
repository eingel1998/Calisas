// Avisos de interpretación geoquímica para calizas cementeras (ASTM C150 / NTC 321).
// Extraído de app.vue: era una referencia colgante (se llamaba en el template pero
// nunca estuvo definida en el script). Primera implementación formal del helper.
// ponytail: umbrales heurísticos derivados de límites ASTM C150 / NTC 321; calibrarlos
// con el dominio si el dictamen geológico lo exige.

export interface SampleGeologia {
  caco3?: number | null
  mgo?: number | null
  sio2?: number | null
  so3?: number | null
  drx?: string | null
}

export function getGeologyWarnings(sample: SampleGeologia | null | undefined): string[] {
  if (!sample) return []
  const warnings: string[] = []
  if ((sample.mgo ?? 0) > 5) {
    warnings.push('MgO alto (>5%): riesgo de dolomitización, puede afectar la expansión del cemento.')
  }
  if ((sample.sio2 ?? 0) > 12) {
    warnings.push('SiO2 elevado (>12%): posible presencia de chert o arcillas que exigen mayor temperatura de cocción.')
  }
  if ((sample.so3 ?? 0) > 3) {
    warnings.push('SO3 elevado (>3%): exceso de sulfatos, riesgo de reacciones expansivas (ettringita).')
  }
  if ((sample.caco3 ?? 0) < 80) {
    warnings.push('CaCO3 bajo (<80%): ley de carbonato insuficiente para cemento Portland.')
  }
  if (sample.drx === 'Dolomita') {
    warnings.push('Fase dominante dolomítica: el MgO asociado puede comprometer la aptitud cementera.')
  }
  return warnings
}