import { describe, it, expect } from 'vitest'
import { parsear_reporte_xrf, evaluar_perfiles, evaluar_muestra, validar_numero, resumir_dictamenes } from './calculos'

export const M7 = `M7
Sample ident
Compound MgO Al2O3 SiO2 K2O CaO Fe2O3 As
Conc 0,314 0,802 2,266 0,187 95,843 0,507 2,9
Unit % % % % % % ppm
Compound Pb Sn
Conc 3,0 115,2
Unit ppm ppm`

describe('análisis fiable', () => {
  it('extrae M7 sin inventar ceros ni perder elementos', () => {
    const d = parsear_reporte_xrf(M7)!
    expect(d.cao).toBe(95.843)
    expect(d.as_ppm).toBe(2.9)
    expect(d.pb).toBe(3)
    for (const k of ['cd','na2o','so3','p2o5','caco3']) expect(d[k]).toBeNull()
    expect(d.originales.find(x => x.compuesto === 'Sn')?.valor).toBe(115.2)
  })
  it('no acepta columnas truncadas ni tokens parciales', () => {
    expect(() => parsear_reporte_xrf('Compound CaO MgO\nConc 52\nUnit % %')).toThrow()
    expect(() => parsear_reporte_xrf('Compound CaO\nConc 52abc\nUnit %')).toThrow()
    expect(parsear_reporte_xrf('Compound CaO Cd\nConc 52 <0,1\nUnit % ppm')?.cd).toBeNull()
  })
  it('valida entradas conservando cero', () => {
    expect(validar_numero('', 'CaO', 100)).toBeNull()
    expect(validar_numero(0, 'CaO', 100)).toBe(0)
    expect(validar_numero('0,314', 'CaO', 100)).toBe(0.314)
    for (const v of [NaN, Infinity, -1, 101, '12abc', {}, true]) expect(() => validar_numero(v,'CaO',100)).toThrow()
  })
  it('compara sin redondear y muestra falta de ensayo', () => {
    const vidrio = (v: number | null) => evaluar_perfiles({caco3:99,fe2o3:v}).find(p=>p.nombre==='Industria del vidrio')!
    expect(vidrio(0.0499).estado).toBe('Apto')
    expect(vidrio(0.05).estado).toBe('No Apto')
    expect(vidrio(0.0501).estado).toBe('No Apto')
    expect(vidrio(null).estado).toBe('Requiere ensayos')
  })
  it('M7 se normaliza y produce resultados útiles con los datos disponibles', () => {
    const r = evaluar_muestra({id_muestra:'M7', ...parsear_reporte_xrf(M7)})
    expect(r.contexto.base).toBe('calcinada')
    expect(r.contexto.convertir).toBe(true)
    expect(r.contexto.procedencia.loi).toBe('estimado')
    expect(r.resumen!.aptos).toBeGreaterThan(0)
    expect(r.resumen!.no_aptos).toBeGreaterThan(0)
    expect(r.resumen!.pendientes).toBeLessThan(17)
    expect(r.c3s).toBeNull()
    expect(r.loi).not.toBeNull()
  })
  it('conserva LOI medido cero y 43 y convierte las trazas en la misma base', () => {
    for (const loi of [0,43]) {
      const r= evaluar_muestra({id_muestra:'M7',...parsear_reporte_xrf(M7),contexto:{base:'calcinada',convertir:true,loi}})
      expect(r.loi).toBe(loi)
      expect(r.cao).toBeCloseTo(95.843*(100-loi)/100,10)
      expect(r.pb).toBeCloseTo(3*(100-loi)/100,10)
      expect(r.contexto.procedencia.loi).toBe('medido')
      expect(r.contexto.originales.find(x=>x.compuesto==='CaO')?.valor).toBe(95.843)
    }
  })
  it('solo faltantes numéricos dejan pendiente; observaciones no bloquean', () => {
    const r=evaluar_muestra({id_muestra:'A',caco3:99,cao:55,mgo:0,sio2:0,fe2o3:0,contexto:{base:'seca'}})
    expect(r.dictamenes.find(p=>p.nombre==='Cal agrícola')?.estado).toBe('Requiere ensayos')
    for (const n of ['Industria de pinturas','Industria del caucho','Tratamiento de aguas']) expect(r.dictamenes.find(p=>p.nombre===n)?.estado).toBe('Apto')
    expect(r.dictamenes.find(p=>p.nombre==='Producción de cal viva')?.criterios.find(c=>c.campo==='mgco3')?.estado).toBe('Cumple')
    expect(r.dictamenes.find(p=>p.nombre==='Industria alimentaria')?.estado).toBe('Requiere ensayos')
    expect(Object.values(r.resumen!).reduce((a,b)=>a+b,0)).toBe(17)
    expect(resumir_dictamenes([])).toBeNull()
  })
})
