// POST /api/procesar-pdf — mismo contrato que backend/main.py
import { extraer_texto_pdf } from '../utils/pdf'
import { parsear_reporte_xrf, es_base_calcinada, convertir_base_seca, validar_extraccion } from '../utils/calculos'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    const file = form?.find((p) => p.name === 'file')
    if (!file?.data) {
      throw createError({ statusCode: 400, statusMessage: 'No se encontró el archivo en el request.' })
    }

    const convertir = form?.find((p) => p.name === 'convertir')?.data?.toString() !== 'false'
    const loiRaw = form?.find((p) => p.name === 'loi_manual')?.data?.toString()
    const loiManual = loiRaw ? Number(loiRaw) : undefined

    const textoPdf = await extraer_texto_pdf(file.data)
    const datos = parsear_reporte_xrf(textoPdf)

    if (!datos) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se encontró la tabla de óxidos en el PDF (¿es solo el espectro?). Suba el reporte \'Sample results\'.',
      })
    }

    const isCalcinado = es_base_calcinada(datos)
    let datosFinal: any = datos

    if (isCalcinado && convertir) {
      datosFinal = convertir_base_seca(datos, loiManual)
    }
    const avisos = validar_extraccion(datosFinal)

    // fallback id a nombre del archivo
    if (!datosFinal.muestra_id) {
      datosFinal = { ...datosFinal, muestra_id: file.filename?.replace(/\.[^.]+$/, '') ?? '' }
    }

    return { datos: datosFinal, texto_crudo: textoPdf, es_base_calcinada: isCalcinado, avisos }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 500, statusMessage: `Error procesando el PDF: ${e.message}` })
  }
})