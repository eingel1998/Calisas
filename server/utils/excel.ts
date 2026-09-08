import ExcelJS from 'exceljs'
import { resumir_dictamenes } from './calculos'

export async function exportar_historial_excel(muestras: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Calizas Historial')
  const campos: Record<string,string> = {
    id_muestra:'ID Muestra',caco3:'CaCO₃ (%)',cao:'CaO (%)',mgo:'MgO (%)',sio2:'SiO₂ (%)',fe2o3:'Fe₂O₃ (%)',al2o3:'Al₂O₃ (%)',so3:'SO₃ (%)',na2o:'Na₂O (%)',k2o:'K₂O (%)',p2o5:'P₂O₅ (%)',pb:'Pb (ppm)',cd:'Cd (ppm)',as_ppm:'As (ppm)',drx:'DRX',petrografia:'Petrografía',loi:'LOI (%)',res_insol:'Residuo Insoluble (%)',alcalis:'Álcalis (Na₂Oeq) (%)',lsf:'LSF',sm:'Módulo de Sílice',am:'Módulo de Alúmina',c3s:'C₃S histórico (%)',c2s:'C₂S histórico (%)',c3a:'C₃A histórico (%)',c4af:'C₄AF histórico (%)',archivo_fuente:'Archivo Fuente',fecha_registro:'Fecha Registro',
  }
  ws.addRow([...Object.values(campos),'Versión de evaluación','Base del informe','Base de trazas','Usos que cumplen','Usos que incumplen','Usos con pendientes','Estado histórico','Evidencia PDF'])
  const dictamenes=wb.addWorksheet('Dictámenes')
  dictamenes.addRow(['ID Muestra','Uso','Resultado','Explicación','Referencia de la matriz'])
  const criterios=wb.addWorksheet('Criterios')
  criterios.addRow(['ID Muestra','Uso','Criterio','Valor usado','Unidad','Operador','Límite','Resultado','Procedencia'])
  const originales=wb.addWorksheet('Datos originales')
  originales.addRow(['ID Muestra','Compuesto','Texto original','Valor original','Unidad'])
  const ensayo=wb.addWorksheet('Datos del ensayo')
  ensayo.addRow(['ID Muestra','Dato del ensayo','Valor original'])
  const usados=wb.addWorksheet('Datos usados')
  usados.addRow(['ID Muestra','Campo','Valor usado','Procedencia'])
  for (const m of muestras) {
    const resumen=resumir_dictamenes(m.dictamenes)
    ws.addRow([...Object.keys(campos).map(k=>m[k]??null),m.version_evaluacion??'Histórica',m.contexto?.base??'Sin información',m.contexto?.base_trazas??'Sin información',resumen?.aptos??null,resumen?.no_aptos??null,resumen?.pendientes??null,m.version_evaluacion===2?null:m.estado_eval??null,m.evidencia?.nombre??null])
    if(!resumen) dictamenes.addRow([m.id_muestra,null,'Resultado no disponible'])
    else for (const d of m.dictamenes) {
      dictamenes.addRow([m.id_muestra,d.nombre,d.estado,d.razon,d.norma])
      for (const c of d.criterios??[]) criterios.addRow([m.id_muestra,d.nombre,c.etiqueta,c.valor??null,c.unidad,c.op,c.limite,c.estado,c.procedencia??null])
    }
    for(const [k,v] of Object.entries(m.contexto?.metadatos??{})) ensayo.addRow([m.id_muestra,k,v])
    for(const d of m.contexto?.originales??[]) originales.addRow([m.id_muestra,d.compuesto,d.texto,d.valor??null,d.unidad])
    for(const [k,v] of Object.entries(m.contexto?.usados??{})) usados.addRow([m.id_muestra,k,v??null,m.contexto?.procedencia?.[k]??null])
  }
  for(const sheet of wb.worksheets) {
    sheet.views=[{state:'frozen',ySplit:1}]
    sheet.getRow(1).font={bold:true}
    sheet.columns.forEach(c=>{c.width=24})
    sheet.getColumn(1).width=20
    sheet.eachRow((r,n)=>{if(n>1) r.eachCell(c=>{if(typeof c.value==='number') c.numFmt='0.############'})})
  }
  dictamenes.getColumn(4).width=90
  dictamenes.getColumn(4).alignment={wrapText:true,vertical:'top'}
  criterios.getColumn(3).width=40
  return Buffer.from(await wb.xlsx.writeBuffer())
}
