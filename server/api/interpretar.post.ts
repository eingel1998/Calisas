// POST /api/interpretar — narración LLM de una evaluación ya calculada.
import { interpretar_evaluacion, llm_configurado } from '../utils/llm'
import { guardar_interpretacion_db } from '../utils/db'

export default defineEventHandler(async (event) => {
  if (!llm_configurado()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Interpretación IA no configurada: defina LLM_API_KEY (y opcionalmente LLM_BASE_URL, LLM_MODEL) en el entorno.',
    })
  }
  const body = await readBody(event)
  const muestra = body?.muestra
  if (!muestra || !Array.isArray(muestra.dictamenes)) {
    throw createError({ statusCode: 400, statusMessage: 'Falta la evaluación de la muestra (campo "muestra" con dictámenes).' })
  }
  try {
    const interpretacion = await interpretar_evaluacion(muestra)
    // se guarda para no repetir la inferencia al consultar el historial
    if (muestra.id_muestra) {
      await guardar_interpretacion_db(muestra.id_muestra, interpretacion).catch((e: any) => {
        console.log(`[LLM] no se pudo guardar la interpretación de ${muestra.id_muestra}: ${e.message}`)
      })
    }
    return { interpretacion }
  } catch (e: any) {
    throw createError({ statusCode: 502, statusMessage: `Error generando la interpretación: ${e.message}` })
  }
})
