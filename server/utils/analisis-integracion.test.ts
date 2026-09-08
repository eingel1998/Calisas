import {it,expect} from 'vitest'
import ExcelJS from 'exceljs'
import {evaluar_muestra,parsear_reporte_xrf,resumir_dictamenes} from './calculos'
import {exportar_historial_excel} from './excel'
import {parsear_lote} from './lote'

it('exporta valores, origen y resumen idénticos, incluido cero', async()=> {
 const r=evaluar_muestra({id_muestra:'EXCEL',caco3:99,cao:55,fe2o3:0.0499,cd:0,contexto:{base:'seca',base_trazas:'seca',loi:0}})
 const wb=new ExcelJS.Workbook()
 await wb.xlsx.load(await exportar_historial_excel([r]))
 const ws=wb.worksheets[0]
 const encabezados=ws.getRow(1).values as string[]
 const valor=(k:string)=>ws.getRow(2).getCell(encabezados.indexOf(k)).value
 expect(valor('LOI (%)')).toBe(0)
 expect(valor('Cd (ppm)')).toBe(0)
 expect(valor('Na₂O (%)')).toBeNull()
 expect(valor('Fe₂O₃ (%)')).toBe(0.0499)
 expect(valor('Usos que cumplen')).toBe(r.resumen?.aptos)
 expect(wb.getWorksheet('Dictámenes')!.rowCount).toBe(18)
 expect(wb.getWorksheet('Datos originales')!.rowCount).toBeGreaterThan(1)
})
it('lote entiende subíndices, ppm, coma decimal y ausencia',async()=> {
 const rows=await parsear_lote(Buffer.from('ID Muestra;CaCO₃ (%);CaO (%);Cd (ppm)\nA;99;55,1234;'),'m.csv')
 expect(rows[0]).toEqual({IDMUESTRA:'A',CACO3:'99',CAO:'55,1234',CD:''})
 expect(()=>resumir_dictamenes(Array(17).fill(null))).not.toThrow()
 expect(resumir_dictamenes(Array(17).fill(null))).toBeNull()
 await expect(parsear_lote(Buffer.from('other;CaO\nA;55'),'m.csv')).rejects.toThrow('ID Muestra')
})
it('trazas se convierten una vez y derivados sí permiten evaluar',()=> {
 const req={id_muestra:'A',cao:90,mgo:1,pb:4,contexto:{base:'calcinada',base_trazas:'calcinada',convertir:true,loi:40}}
 const r=evaluar_muestra(req)
 expect(r.pb).toBe(2.4)
 expect(()=>evaluar_muestra(r)).toThrow('segunda conversión')
 expect(r.contexto.entrada?.pb).toBe(4)
 expect(evaluar_muestra(req).pb).toBe(2.4)
 expect(evaluar_muestra({...req,cao:95}).caco3).toBeNull()
 expect(r.contexto.procedencia.caco3).toBe('estimado')
 expect(r.dictamenes.some(p=>p.estado==='Apto')).toBe(true)
 expect(()=>evaluar_muestra({...req,contexto:{base:'calcinada',convertir:true}})).toThrow('LOI')
 expect(()=>evaluar_muestra({...req,contexto:{base:'seca',convertir:true}})).toThrow('base calcinada')
})
it('PDF con ID en línea y duplicados contradictorios',()=>{
 expect(parsear_reporte_xrf('M7 Sample ident\nCompound CaO\nConc 55\nUnit %')?.muestra_id).toBe('M7')
 expect(()=>parsear_reporte_xrf('Compound CaO\nConc 55\nUnit %\nCompound CaO\nConc 56\nUnit %')).toThrow('duplicados')
})
it('conserva todos los componentes y la información del ensayo al guardar y exportar',async()=>{
 const texto=`10-feb-2026 14:24:22 Page 1 Sample results
M7 Sample ident
Application <Omnian>
Sequence 1 of 1
Position 4
Measurement time 12-nov-2025 13:50:06
Initial weight 10,000
Final weight 11,000
Normalisation factor 1,032
Minimum He Flow (l/min) 2,31
Compound MgO Al2O3 SiO2 Cl K2O CaO Ti V Cr Mn Fe2O3 Zn As
Conc 0,314 0,802 2,266 0,0 0,187 95,843 211,6 62,9 18,1 142,9 0,507 49,1 2,9
Unit % % % ppm % % ppm ppm ppm ppm % ppm ppm
Compound Zr Sn Te Sm Pb Eu Yb Lu Re
Conc 39,6 115,2 122,8 7,1 3,0 0,0 17,2 8,0 1,4
Unit ppm ppm ppm ppm ppm ppm ppm ppm ppm`
 const d=parsear_reporte_xrf(texto)!
 expect(d.originales).toHaveLength(22)
 expect(d.metadatos['Fecha de medición']).toBe('12-nov-2025 13:50:06')
 const r=evaluar_muestra({...d,id_muestra:'M7'})
 expect(r.contexto.originales).toEqual(d.originales)
 expect(r.contexto.texto_reporte).toBe(texto)
 expect(r.contexto.metadatos['Factor de normalización']).toBe('1,032')
 const wb=new ExcelJS.Workbook()
 await wb.xlsx.load(await exportar_historial_excel([r]))
 expect(wb.getWorksheet('Datos originales')!.rowCount).toBe(23)
 const ensayo=wb.getWorksheet('Datos del ensayo')!
 expect(ensayo.getSheetValues().flat(2)).toContain('12-nov-2025 13:50:06')
})
