import { parsear_lote } from '../utils/lote'
import { evaluar_muestra, CAMPOS, EXTRAS } from '../utils/calculos'
import { registrar_muestras_db } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    const file = form?.find(p => p.name === 'file')
    if (!file?.data || !file.filename) throw createError({ statusCode:400, statusMessage:'Seleccione un archivo CSV o XLSX.' })
    let contexto: Record<string,any>
    try { contexto=JSON.parse(form?.find(p=>p.name==='contexto')?.data.toString()??'{}') }
    catch { throw createError({statusCode:400,statusMessage:'Contexto de lote inválido.'}) }
    const filas = await parsear_lote(file.data,file.filename)
    if (!filas.length) throw createError({statusCode:400,statusMessage:'No hay muestras en el archivo.'})
    const muestras = filas.map((row,idx)=> {
      try {
        const datos = Object.fromEntries(CAMPOS.map(k=>[k,row[k==='as_ppm'?'AS':k.toUpperCase()]]))
        const extras=Object.fromEntries(EXTRAS.map(k=>[k,row[k.replaceAll('_','').toUpperCase()]]))
        return evaluar_muestra({...datos,id_muestra:row.IDMUESTRA==null?'':String(row.IDMUESTRA),drx:row.DRX,petrografia:row.PETROGRAFIA,archivo_fuente:file.filename,contexto:{...contexto,loi:row.LOI??contexto?.loi},extras})
      } catch(e:any) { throw createError({statusCode:400,statusMessage:`Fila ${idx+2}: ${e.message}`}) }
    })
    await registrar_muestras_db(muestras)
    return {status:'ok',count:muestras.length,muestras}
  } catch(e:any) {
    throw createError({statusCode:e.statusCode||500,statusMessage:e.message||'No se pudo procesar el lote.'})
  }
})
