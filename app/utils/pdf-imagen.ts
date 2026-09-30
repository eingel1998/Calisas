import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Primera página del PDF como PNG, para enviársela al modelo como imagen.
// `rotacion` corrige reportes impresos de lado (el espectro Omnian sale girado 90°).
export async function pdf_a_png(file: File, rotacion = 0, escala = 2): Promise<File> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: escala, rotation: (page.rotate + rotacion) % 360 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('No se pudo generar la imagen')), 'image/png'))
    return new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
  } finally { await doc.destroy() }
}

// Una gráfica subida como JPG/PNG/WEBP se normaliza a PNG, el formato que guarda el servidor.
export async function imagen_a_png(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('No se pudo convertir la imagen')), 'image/png'))
  return new File([blob], file.name.replace(/\.\w+$/, '.png'), { type: 'image/png' })
}
