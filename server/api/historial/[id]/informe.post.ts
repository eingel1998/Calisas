import { ALCANCES, type Alcance, error_db, guardar_informe_db, obtener_analisis_termico_db, obtener_config_petrografia_db, obtener_drx_db, obtener_drx_pngs_db, obtener_imagenes_frx_db, obtener_imagenes_petrografia_db, obtener_informes_db, obtener_muestras_db, obtener_petrografia_db } from '../../../utils/db'
import { mensaje_informe, system_prompt_informe, tarea_informe } from '../../../utils/informe-integral'
import { aiClient, enrutamiento_proveedor, error_proveedor } from '../../../utils/ai-client'

const ETIQUETA: Record<string, string> = { frx_tabla_png: 'tabla de resultados FRX (Sample results)', frx_espectro_png: 'espectro FRX (cps vs keV) con picos identificados' }
// Qué imágenes de laboratorio ve cada informe.
const FRX_POR_ALCANCE: Record<Alcance, boolean> = { integral: true, frx: true, drx: false, petrografia: false, termicas: false }
// Cada informe individual ve solo sus imágenes; el integral ve todas.
const DRX_POR_ALCANCE: Record<Alcance, boolean> = { integral: true, frx: false, drx: true, petrografia: false, termicas: false }

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const alcance = ((await readBody(event).catch(() => null))?.alcance || 'integral') as Alcance
  if (!ALCANCES.includes(alcance)) throw error_db(400, 'Tipo de informe inválido')
  const [muestra] = await obtener_muestras_db(undefined, id)
  if (!muestra) throw error_db(404, 'La muestra no existe')
  const config = await obtener_config_petrografia_db()
  if (!config.apiKey) throw createError({ statusCode: 503, statusMessage: 'Configura la clave de IA en Configuración antes de generar el informe' })

  const [drx, termicas, petro, fotos, frxImgs, graficasDrx, informes] = await Promise.all([obtener_drx_db(id), obtener_analisis_termico_db(id), obtener_petrografia_db(id), obtener_imagenes_petrografia_db(id), obtener_imagenes_frx_db(id), obtener_drx_pngs_db(id), obtener_informes_db(id)])
  const imagenDrx = graficasDrx.length > 0
  const tieneDrx = Boolean(drx.fases?.length) || imagenDrx
  // Cada informe exige su fuente: FRX la tabla, DRX la gráfica, petrografía las fotos, térmicas la lectura.
  const tieneFrx = ['caco3', 'cao', 'mgo', 'sio2'].some(k => muestra[k] != null)
  if (['frx', 'integral'].includes(alcance) && !tieneFrx) throw error_db(400, 'La muestra no tiene FRX: es la base del análisis')
  if (alcance === 'drx' && !tieneDrx) throw error_db(400, 'La muestra no tiene la gráfica DRX')
  if (alcance === 'petrografia' && !fotos.length) throw error_db(400, 'La petrografía se analiza con las fotos de secciones delgadas; agrégalas con «Editar muestra»')
  if (alcance === 'termicas' && !termicas) throw error_db(400, 'La muestra no tiene propiedades térmicas registradas')

  // En el integral, un informe revisado reemplaza a sus imágenes crudas: menos costo, evidencia ya validada.
  const revisado = (a: Alcance) => alcance === 'integral' && informes[a]?.estado === 'revisado'
  const imgsFrx = FRX_POR_ALCANCE[alcance] && !revisado('frx') ? frxImgs : []
  const imgsDrx = DRX_POR_ALCANCE[alcance] && !revisado('drx') ? graficasDrx : []
  const imgsFotos = ['integral', 'petrografia'].includes(alcance) && !revisado('petrografia') ? fotos : []
  const leyenda = [...imgsFrx.map(i => ETIQUETA[i.tipo]), ...imgsDrx.map((g, n) => `gráfica DRX ${n + 1} de ${imgsDrx.length} (archivo «${g.nombre}»; verifica que corresponda a la muestra ${id})`), ...imgsFotos.map(i => `sección delgada ${i.nombre} (${i.condicion})`)]

  const petrografia = fotos.length || petro.datos || petro.informe
    ? { datos: petro.datos, informe_previo: alcance === 'petrografia' ? null : petro.informe || null, estado: petro.estado || null, imagenes: fotos.map(i => `${i.nombre} (${i.condicion})`) }
    : null
  const { fecha_registro, ...termicasMedidas } = (termicas || {}) as Record<string, unknown>
  const texto = mensaje_informe(alcance, muestra, {
    drx: tieneDrx ? { ...drx, imagen: imagenDrx } : null, termicas: termicas ? termicasMedidas : null, petrografia, imagenes: leyenda,
    informes, region: config.prompts.region,
  })
  // La herramienta de búsqueda es propia de OpenRouter; con otro proveedor el informe sale sin ella.
  const quiereWeb = alcance === 'integral' && config.prompts.busqueda_web === '1'
  const web = quiereWeb && /(^|\.)openrouter\.ai$/.test(new URL(config.baseURL).hostname)

  const mensajes = (conWeb: boolean) => [
    { role: 'system' as const, content: system_prompt_informe(alcance, config.prompts, { drx: tieneDrx, termicas: Boolean(termicas), petrografia: Boolean(fotos.length) }, { web: conWeb }) },
    { role: 'user' as const, content: [
      { type: 'text' as const, text: texto },
      ...imgsFrx.map(im => ({ type: 'image_url' as const, image_url: { url: `data:image/png;base64,${Buffer.from(im.contenido).toString('base64')}`, detail: 'high' as const } })),
      ...imgsDrx.map(im => ({ type: 'image_url' as const, image_url: { url: `data:image/png;base64,${Buffer.from(im.contenido).toString('base64')}`, detail: 'high' as const } })),
      ...imgsFotos.map(im => ({ type: 'image_url' as const, image_url: { url: `data:${im.tipo};base64,${Buffer.from(im.contenido).toString('base64')}`, detail: 'high' as const } })),
      { type: 'text' as const, text: tarea_informe(alcance, { web: conWeb }) },
    ] },
  ]
  // Exa con tope de búsquedas: costo predecible (~US$0,007 por búsqueda).
  const HERRAMIENTA_WEB = { type: 'openrouter:web_search', parameters: { engine: 'exa', max_uses: 8, max_results: 5, max_total_results: 30 } }
  const pedir = (conWeb: boolean) => aiClient(config.apiKey, config.baseURL, 280_000).chat.completions.create({
    model: config.model, max_tokens: 32000, temperature: 0.2, messages: mensajes(conWeb),
    ...(conWeb ? { tools: [HERRAMIENTA_WEB] as any } : {}),
    ...enrutamiento_proveedor(config.baseURL, config.proveedor),
  })

  let informe = ''
  let aviso = quiereWeb && !web ? 'La búsqueda web solo funciona con OpenRouter como proveedor; el informe se generó sin ella.' : ''
  try {
    let response
    try { response = await pedir(web) }
    catch (e) {
      if (!web) throw e
      // la herramienta está en beta: mejor un informe sin web que ninguno
      response = await pedir(false)
      aviso = 'La búsqueda web falló; el informe se generó sin ella.'
    }
    const msg: any = response.choices[0]?.message
    informe = msg?.content?.trim() || ''
    // solo vale un informe que terminó normalmente: un corte por longitud, filtro o error dejaría un texto a medias
    const fin = response.choices[0]?.finish_reason
    if (informe && fin !== 'stop') {
      const nativo = (response.choices[0] as any)?.native_finish_reason
      console.error(`[informe ${alcance}] respuesta incompleta: finish_reason=${fin} nativo=${nativo} (${informe.length} caracteres)`)
      throw createError({ statusCode: 502, data: { incompleto: true }, statusMessage: fin === 'length'
        ? 'El informe superó la longitud máxima y quedó cortado; no se guardó. Intenta de nuevo.'
        : `El proveedor cortó la respuesta antes de terminar (${nativo || fin || 'sin motivo'}); no se guardó. Intenta de nuevo.` })
    }
    const fuentes = [...new Map((msg?.annotations || []).filter((a: any) => a.type === 'url_citation').map((a: any) => [a.url_citation.url, a.url_citation.title || a.url_citation.url])).entries()]
    const faltan = fuentes.filter(([url]) => !informe.includes(String(url)))
    if (informe && faltan.length) informe += `\n\n## Fuentes web adicionales citadas por el buscador\n${faltan.map(([url, t]) => `- [${t}](${url})`).join('\n')}`
  } catch (e: any) {
    if (e?.data?.incompleto) throw e // error propio (respuesta incompleta), no del proveedor
    console.error(`[informe ${alcance}] ${config.baseURL} · ${config.model}:`, e?.status, e?.error?.message || e?.message)
    throw createError({ statusCode: 502, statusMessage: error_proveedor(e, config.model) })
  }
  if (!informe) throw createError({ statusCode: 502, statusMessage: 'El informe quedó incompleto; intenta de nuevo' })

  await guardar_informe_db(id, alcance, informe, 'borrador', config.model)
  return { alcance, informe, modelo: config.model, estado: 'borrador', web, aviso }
})
