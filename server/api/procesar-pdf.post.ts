import { extraer_texto_pdf } from '../utils/pdf'
import { parsear_reporte_xrf, es_base_calcinada, validar_extraccion } from '../utils/calculos'
import { validar_pdf_evidencia } from '../utils/evidencia'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    const file = form?.find(p => p.name === 'file')
    if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'Seleccione un PDF de resultados.' })
    await validar_pdf_evidencia(file.data)
    const texto = await extraer_texto_pdf(file.data)
    const datos = parsear_reporte_xrf(texto)
    if (!datos) throw createError({ statusCode: 400, statusMessage: 'No contiene una tabla de concentraciones extraíble. El espectro puede adjuntarse como evidencia; cargue el informe Sample results para extraer datos.' })
    if (!datos.muestra_id) datos.muestra_id = file.filename?.replace(/\.[^.]+$/, '') ?? ''
    return { datos, texto_crudo: texto, es_base_calcinada: es_base_calcinada(datos), avisos: validar_extraccion(datos) }
  } catch (e: any) {
    throw createError({ statusCode: e.statusCode || 400, statusMessage: e.message || 'No se pudo leer el PDF.' })
  }
})
