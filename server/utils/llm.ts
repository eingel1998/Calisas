// Capa LLM del módulo de evaluación. Dos usos, mismo cliente:
//  1. interpretar_evaluacion — narra en lenguaje natural una evaluación YA
//     calculada (nunca calcula valores ni emite dictámenes).
//  2. extraer_tabla_imagen — camino B: modelo de visión lee la tabla "Sample
//     results" de una imagen; el usuario SIEMPRE confirma los valores en el
//     paso 2 del modal antes de evaluar.
// Cliente OpenAI-compatible por fetch (OpenRouter, Novita u otro) vía env:
//   LLM_API_KEY          (obligatoria)
//   LLM_BASE_URL         (default https://openrouter.ai/api/v1)
//   LLM_MODEL            texto; lista separada por comas = fallbacks en orden
//   LLM_VISION_MODEL     visión; misma semántica de lista

// Matriz de referencia: mismos umbrales que PERFILES_INDUSTRIALES en calculos.ts.
// Le da al modelo el contexto normativo para EXPLICAR los dictámenes (no para
// recalcularlos) y para razonar sobre qué ensayo conviene priorizar.
const MATRIZ_REFERENCIA = `Matriz de usos industriales de la caliza (referencia normativa):
- Cementera — clinker/Portland: CaCO3>75-80%, CaO>42%, MgO<5%, SiO2<15%, Fe2O3<5%. Evalúa XRF, DRX, LOI, petrografía. ASTM C150/C114, NTC 121, NTC 321.
- Cal viva — calcinación a CaO: CaCO3>95%, SiO2<2%, MgCO3<5%, Fe2O3<1%. Alta pureza y reactividad. ASTM C25/C51/C911.
- Cal hidratada — Ca(OH)2: CaO disponible>90%, MgO<3%. ASTM C206/C207/C911.
- Cal agrícola — neutralización de suelos: CaCO3 equivalente>80%, Poder Neutralizante>80%. NTC 5163, ASTM C602.
- Siderúrgica — fundente en altos hornos: CaCO3>90%, SiO2<2%, P2O5<0.05%, S<0.03%. Fósforo y azufre bajos son críticos. ISO 12677, ASTM E1915.
- Química — carbonato precipitado (PCC): CaCO3>98%, Fe2O3<0.05%, MgO<1%. Alta blancura. ASTM C602, ISO 3262.
- Vidrio: CaCO3>95%, Fe2O3<0.05%. El hierro colorea el vidrio. ASTM C146, ISO 1288.
- Cerámica: CaCO3>90%, Fe2O3<0.5%. Estabilidad mineralógica. ISO 13006, ASTM C373.
- Papel — carga y recubrimiento: CaCO3>98%, blancura>95%, tamaño<2 um. ISO 2469/2470.
- Pinturas: CaCO3>98%, Fe2O3<0.1%, granulometría muy fina. ISO 3262-2, ASTM D1199.
- Plástico: CaCO3>98%, humedad<0.2%, tamaño<5 um. ISO 3262, ASTM D5630.
- Caucho — relleno: CaCO3>97%, granulometría ultrafina. ASTM D1193, ISO 3262.
- Tratamiento de aguas: CaCO3>90% y alta reactividad/velocidad de disolución. AWWA B202, ASTM C25.
- Protección ambiental — drenajes ácidos y desulfuración: CaCO3>90%, CaO reactivo>85%. EPA 3052, ASTM C25.
- Construcción — agregados y roca ornamental: resistencia>50 MPa, absorción<5%. ASTM C568/C97/C170, NTC 174.
- Alimentaria (E170): CaCO3>98.5% y ausencia de metales pesados. Referencias: FCC exige ensayo minimo 98.0% en base seca, Pb<=3 ppm, As<=3 ppm, metales pesados totales<=20 ppm; el Reglamento (UE) 231/2012 es aun mas estricto en Pb. Codex Alimentarius, FCC, UE 231/2012.
- Farmacéutica — excipiente y suplementos: CaCO3>99% y ausencia de metales pesados. Referencias: USP exige 98.0-100.5% sobre sustancia seca y metales pesados<=0.002% (20 ppm); Ph. Eur. exige 98.5-100.5%, As<=4 ppm, Fe<=10 ppm, metales pesados<=20 ppm. USP, Ph. Eur., BP.`

const SYSTEM_PROMPT = `Eres un geólogo consultor experto en calizas industriales y control de calidad minero.
Recibirás un JSON con los resultados YA CALCULADOS de la evaluación geoquímica de una muestra de caliza (análisis XRF), incluyendo módulos cementeros (LSF, SM, AM), fases de Bogue, el reporte XRF completo y el dictamen normativo de 17 perfiles de uso industrial.

${MATRIZ_REFERENCIA}

Tu tarea es redactar una interpretación técnica en español, natural y clara, para un ingeniero o geólogo que decidirá el destino comercial del material.

Reglas estrictas:
- NO recalcules ningún valor ni contradigas los dictámenes del JSON: son deterministas y normativos. Tu rol es explicarlos y fundamentarlos con la matriz, no modificarlos.
- NO inventes valores que no estén en el JSON. Un campo null significa "no medido": trátalo como ensayo pendiente, nunca como cero.
- Cita los valores exactos del JSON cuando los menciones, con su unidad (% o ppm).
- Sobre la base de cálculo: los campos de primer nivel (cao, mgo, sio2…) son los que reportó el laboratorio. Si "base_calcinada" es true, el XRF normalizó los óxidos a 100% sin LOI, y los criterios normativos se contrastaron sobre "base_evaluacion" (base carbonato, tras reconstruir el CO2). Al justificar un dictamen usa los valores de base_evaluacion y menciona esa base al menos una vez; no presentes ambas cifras como si fueran mediciones distintas ni digas que hay una discrepancia.
- Cada dictamen trae "confianza" y "salvedades". Si la confianza es "Preliminar" o "Media", debes decirlo explícitamente al mencionar ese perfil y resumir la salvedad (por ejemplo: método XRF semicuantitativo donde la norma pide ICP-MS, o un valor estimado en vez de medido). Nunca presentes un dictamen preliminar como una certificación.
- El campo "elementos" trae el reporte XRF completo, incluidos compuestos sin criterio normativo (Ti, V, Cr, Mn, Zn, Zr, Sn, tierras raras). Menciónalos solo si son geológicamente relevantes o si podrían comprometer un uso de alta pureza (por ejemplo, metales pesados frente a los límites de grado alimentario o farmacéutico); en ese caso indícalo como verificación pendiente por ICP-MS, nunca como un incumplimiento ya determinado.
- Extensión: 200 a 350 palabras. Párrafos y guiones; sin encabezados markdown.
- Texto plano: escribe las fórmulas como CaCO3, SiO2, Fe2O3 — nada de LaTeX ($...$), subíndices ni negritas.

Estructura:
1. Resumen ejecutivo (2-3 frases): calidad general de la muestra y su vocación industrial principal.
2. Química: qué dicen CaCO3/CaO y las impurezas (MgO, SiO2, Fe2O3), y qué implican geológicamente.
3. Usos: los perfiles Aptos más valiosos y por qué; los No Aptos relevantes y qué criterio normativo los descarta.
4. Pendientes: qué ensayos faltantes habilitarían más usos y cuáles conviene priorizar.`

const VISION_PROMPT = `La imagen es un reporte XRF "Sample results" (Panalytical/Omnian) de una muestra de caliza.
Extrae el identificador de la muestra y la tabla de compuestos (filas Compound / Conc / Unit).

Responde SOLO con un JSON válido, sin markdown ni texto adicional:
{"muestra_id":"M10","compuestos":[{"nombre":"CaO","conc":97.501,"unidad":"%"},{"nombre":"Pb","conc":23.8,"unidad":"ppm"}]}

Reglas:
- "nombre": exactamente como aparece en la tabla (MgO, Al2O3, SiO2, CaO, Fe2O3, Pb, etc.)
- "conc": número con punto decimal — el reporte usa coma decimal (0,302 significa 0.302)
- "unidad": "%" o "ppm", la de la columna correspondiente
- Incluye TODOS los compuestos de TODAS las tablas de la imagen. No inventes compuestos ni valores.
- Si la imagen NO contiene esa tabla de resultados (por ejemplo es un espectro/gráfico de picos), responde {"error":"sin_tabla"}`

export function llm_configurado(): boolean {
  return Boolean(process.env.LLM_API_KEY)
}

export function ocr_configurado(): boolean {
  return Boolean(process.env.OCR_API_KEY)
}

// Intenta cada modelo de la lista en orden — los :free se saturan a ratos (429)
// y esto evita que el error llegue al usuario mientras haya alternativa viva.
async function chat(messages: unknown[], modelosEnv: string | undefined, modelosDefault: string, maxTokens = 900): Promise<string> {
  const base = (process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')
  const modelos = (modelosEnv || modelosDefault).split(',').map((m) => m.trim()).filter(Boolean)

  let ultimoError = ''
  for (const model of modelos) {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      },
      body: JSON.stringify({ model, temperature: 0.1, max_tokens: maxTokens, messages }),
      signal: AbortSignal.timeout(90_000),
    })

    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      console.log(`[LLM] ${model} → HTTP ${res.status}\n${detalle.slice(0, 1000)}`)
      ultimoError = `${model} respondió ${res.status}: ${detalle.slice(0, 200)}`
      continue
    }
    const data = await res.json()
    console.log(`[LLM] ${model} → respuesta:\n${JSON.stringify(data, null, 2)}`)
    const texto = data?.choices?.[0]?.message?.content?.trim()
    if (texto) return texto
    ultimoError = `${model} devolvió una respuesta vacía.`
  }
  throw new Error(`Ningún modelo LLM disponible. Último error: ${ultimoError}`)
}

export async function interpretar_evaluacion(muestra: Record<string, unknown>): Promise<string> {
  // Solo lo que el narrador necesita: valores, módulos, dictámenes y avisos.
  const campos = [
    'id_muestra', 'caco3', 'cao', 'mgo', 'sio2', 'fe2o3', 'al2o3', 'so3', 'na2o', 'k2o', 'p2o5',
    'pb', 'cd', 'as_ppm', 'loi', 'res_insol', 'alcalis', 'lsf', 'sm', 'am', 'interp_sm', 'interp_am',
    'c3s', 'c2s', 'c3a', 'c4af', 'estado_eval', 'advertencias_geol', 'interp_cesar', 'errores_norma', 'dictamenes',
    'elementos', 'base_calcinada', 'factor_base', 'base_evaluacion',
  ]
  const payload = Object.fromEntries(campos.filter((k) => k in muestra).map((k) => [k, muestra[k]]))

  return chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Evaluación de la muestra:\n${JSON.stringify(payload, null, 1)}` },
    ],
    process.env.LLM_MODEL,
    'meta-llama/llama-3.1-8b-instruct',
  )
}

// DeepSeek-OCR devuelve el documento como markdown (tablas con |). Este
// normalizador lo deja en el formato "Compound... / Conc... / Unit..." que ya
// entiende parsear_reporte_xrf, reutilizando validación y conversión de unidades.
export function normalizar_markdown_ocr(md: string): string {
  const raw = md.split('\n').map((l) => l.trim())
  const lineas: string[] = []
  for (let i = 0; i < raw.length; i++) {
    const l = raw[i]
    if (!l || /^\|?[\s|:-]+\|?$/.test(l)) continue // separadores |---|---|
    if (/^page \d+$/i.test(l)) continue
    if (/^sample ident$/i.test(l)) {
      // el ID suele venir en la línea siguiente: fusionar al formato "M10 Sample ident"
      const sig = raw.slice(i + 1).find((x) => x)
      if (sig && sig.length < 30) lineas.push(`${sig.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()} Sample ident`)
      continue
    }
    lineas.push(l.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim())
  }
  return lineas.join('\n')
}

// Camino imagen, motor principal: modelo OCR dedicado (DeepSeek-OCR) vía API
// OpenAI-compatible. Env: OCR_API_KEY, OCR_BASE_URL, OCR_MODEL.
export async function extraer_texto_ocr(bytes: Buffer | Uint8Array, mime: string): Promise<string | null> {
  const base = (process.env.OCR_BASE_URL || 'https://api.doubleword.ai/v1').replace(/\/$/, '')
  const model = process.env.OCR_MODEL || 'deepseek-ai/DeepSeek-OCR-2'
  const b64 = Buffer.from(bytes).toString('base64')

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OCR_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
          { type: 'text', text: 'Convert the document to markdown.' },
        ],
      }],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const detalle = await res.text().catch(() => '')
    console.log(`[OCR] ${model} → HTTP ${res.status}\n${detalle.slice(0, 1000)}`)
    throw new Error(`OCR ${model} respondió ${res.status}: ${detalle.slice(0, 200)}`)
  }
  const data = await res.json()
  console.log(`[OCR] ${model} → respuesta:\n${JSON.stringify(data, null, 2)}`)
  const md = data?.choices?.[0]?.message?.content?.trim()
  if (!md) return null
  const normalizado = normalizar_markdown_ocr(md)
  console.log(`[OCR] markdown normalizado para el parser:\n${normalizado}`)
  return normalizado
}

interface TablaImagen {
  muestra_id?: string
  compuestos?: { nombre?: string; conc?: number; unidad?: string }[]
  error?: string
}

// Convierte el JSON de visión al formato de texto del reporte para reutilizar
// parsear_reporte_xrf (misma conversión %/ppm y misma heurística de ID).
export function tabla_json_a_texto(tabla: TablaImagen): string | null {
  const filas = (tabla.compuestos ?? []).filter(
    (c) => c.nombre && typeof c.conc === 'number' && Number.isFinite(c.conc) && (c.unidad === '%' || c.unidad === 'ppm'),
  )
  if (!filas.length) return null
  // los modelos de visión a veces parten el ID ("M1 0"): colapsar espacios
  const id = (tabla.muestra_id ?? '').replace(/\s+/g, '')
  const lineas = [
    ...(id ? [`${id} Sample ident`] : []),
    `Compound ${filas.map((c) => c.nombre).join(' ')}`,
    `Conc ${filas.map((c) => c.conc).join(' ')}`,
    `Unit ${filas.map((c) => c.unidad).join(' ')}`,
  ]
  return lineas.join('\n')
}

export async function extraer_tabla_imagen(bytes: Buffer | Uint8Array, mime: string): Promise<string | null> {
  const b64 = Buffer.from(bytes).toString('base64')
  const out = await chat(
    [{
      role: 'user',
      content: [
        { type: 'text', text: VISION_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
      ],
    }],
    // Gemma-26b primero: en pruebas leyó 21/21 dígitos exactos del reporte real.
    // Nemotron-VL queda fuera: es más rápido pero misslee dígitos (1.476 → 14.7).
    process.env.LLM_VISION_MODEL,
    'google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free',
    2500,
  )

  // El modelo puede envolver el JSON en fences o prosa: rescatar del primer { al último }
  const ini = out.indexOf('{')
  const fin = out.lastIndexOf('}')
  if (ini === -1 || fin <= ini) return null
  let tabla: TablaImagen
  try {
    tabla = JSON.parse(out.slice(ini, fin + 1))
  } catch {
    return null
  }
  if (tabla.error) return null
  return tabla_json_a_texto(tabla)
}
