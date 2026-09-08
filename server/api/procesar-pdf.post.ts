// POST /api/procesar-pdf — extracción desde PDF (determinista, capa de texto)
// o desde imagen (modelo de visión + confirmación humana en el paso 2).
import { extraer_texto_pdf } from '../utils/pdf'
import { extraer_tabla_imagen, extraer_texto_ocr, llm_configurado, ocr_configurado } from '../utils/llm'
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

    const esImagen = (file.type ?? '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.filename ?? '')
    const avisosExtra: string[] = []
    let textoPdf: string

    if (esImagen) {
      if (!ocr_configurado() && !llm_configurado()) {
        throw createError({
          statusCode: 503,
          statusMessage: 'La extracción desde imagen requiere configurar OCR_API_KEY o LLM_API_KEY. Suba el PDF del reporte "Sample results".',
        })
      }
      const mime = file.type || 'image/png'
      let texto: string | null = null
      let motor = ''
      // Motor principal: OCR dedicado (DeepSeek-OCR). Si falla o no devuelve
      // una tabla parseable, cae al modelo de visión genérico.
      if (ocr_configurado()) {
        texto = await extraer_texto_ocr(file.data, mime).catch(() => null)
        if (texto && !parsear_reporte_xrf(texto)) texto = null
        if (texto) motor = 'DeepSeek-OCR'
      }
      if (!texto && llm_configurado()) {
        texto = await extraer_tabla_imagen(file.data, mime)
        if (texto) motor = 'modelo de visión'
      }
      if (!texto) {
        throw createError({
          statusCode: 400,
          statusMessage: 'La imagen no contiene la tabla de resultados "Sample results" (¿es el espectro?). Suba una imagen de la tabla o el PDF del reporte.',
        })
      }
      textoPdf = texto
      avisosExtra.push(`Valores extraídos por IA (${motor}) desde una imagen: verifique cada campo contra el reporte original antes de registrar.`)
    } else {
      textoPdf = await extraer_texto_pdf(file.data)
    }

    const datos = parsear_reporte_xrf(textoPdf)

    if (!datos) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se encontró la tabla de óxidos en el PDF (¿es solo el espectro?). Suba el reporte \'Sample results\'.',
      })
    }

    const isCalcinado = es_base_calcinada(datos)
    let datosFinal: any = datos
    let datosOriginales: any = null

    if (isCalcinado && convertir) {
      datosFinal = convertir_base_seca(datos, loiManual)
      datosOriginales = datos
      avisosExtra.push(
        `Conversión a base seca aplicada (LOI estimado ${datosFinal.loi_estimado}%): los valores difieren del reporte, que está en base calcinada. Bajo cada campo se muestra el valor original.`,
      )
    }
    const avisos = [...avisosExtra, ...validar_extraccion(datosFinal)]

    // fallback id a nombre del archivo
    if (!datosFinal.muestra_id) {
      datosFinal = { ...datosFinal, muestra_id: file.filename?.replace(/\.[^.]+$/, '') ?? '' }
    }

    return { datos: datosFinal, datos_originales: datosOriginales, texto_crudo: textoPdf, es_base_calcinada: isCalcinado, avisos }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 500, statusMessage: `Error procesando el PDF: ${e.message}` })
  }
})