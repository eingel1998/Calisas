import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { resolve } from 'node:path'
import { error_db } from './db'

export const MAX_EVIDENCIA_BYTES = 10 * 1024 * 1024
GlobalWorkerOptions.workerSrc = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')

export async function validar_pdf_evidencia(bytes: Uint8Array): Promise<void> {
  if (bytes.length > MAX_EVIDENCIA_BYTES) throw error_db(413, 'El PDF supera 10 MiB')
  if (!bytes.length || Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') throw error_db(400, 'Archivo PDF inválido')
  const task = getDocument({ data: new Uint8Array(bytes), useWorkerFetch: false, isEvalSupported: false })
  try {
    const doc = await task.promise
    if (!doc.numPages) throw new Error('Sin páginas')
  } catch {
    throw error_db(400, 'No se puede abrir el PDF; comprueba que sea válido y no esté protegido')
  } finally { await task.destroy() }
}
