// Extracción de texto PDF server-side con pdfjs-dist (runtime Node, sin canvas ni worker).
// Portado de extraer_datos_pdf (backend/calculos_calizas.py, pypdf) → pdfjs-dist.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { resolve } from 'node:path'

// Nitro no copia pdf.worker.mjs al bundle (import dinámico del fake worker no se tracea);
// apuntamos workerSrc al worker real del node_modules del repo (presente en dev y prod-local).
// El legacy build pre-setea workerSrc (a su propio path inexistente en .output), por eso se fuerza siempre.
// ponytail: worker externo fijo vía cwd; migrar a `createRequire` si se despliega .output standalone.
GlobalWorkerOptions.workerSrc = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')

export async function extraer_texto_pdf(bytes: Buffer | Uint8Array): Promise<string> {
  const doc = await getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise

  const paginas: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const lineas: string[] = []
    let actual = ''
    for (const item of content.items) {
      const str = (item as { str?: string }).str ?? ''
      const hasEOL = item.hasEOL
      actual += str
      if (hasEOL) {
        lineas.push(actual)
        actual = ''
      }
    }
    if (actual) lineas.push(actual)
    paginas.push(lineas.join('\n'))
  }
  await doc.destroy()
  return paginas.join('\n')
}