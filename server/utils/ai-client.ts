import OpenAI from 'openai'

export function aiClient(apiKey: string, baseURL: string, timeout = 90_000): OpenAI {
  return new OpenAI({ apiKey, baseURL, timeout, maxRetries: 0 })
}

// Mensaje legible del error del proveedor (estado + motivo), sin exponer la clave.
export function error_proveedor(e: any, modelo: string) {
  const estado = e?.status ?? e?.statusCode
  const motivo = String(e?.error?.message || e?.message || 'sin detalle').replace(/(sk|Bearer)[-\w.]{8,}/g, '***').slice(0, 300)
  const pista = estado === 401 ? ' Revisa la clave API en Configuración de IA.'
    : estado === 404 || /model/i.test(motivo) ? ` Revisa que el modelo «${modelo}» exista en el proveedor configurado.`
    : estado === 402 ? ' La cuenta del proveedor no tiene saldo.'
    : estado === 429 ? ' El proveedor está saturado o se alcanzó el límite; intenta en un momento.'
    : ''
  return `El proveedor de IA respondió ${estado ?? 'sin conexión'}: ${motivo}.${pista}`
}
