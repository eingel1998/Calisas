// Exportación del historial a Excel con exceljs (mismas columnas que backend/main.py).
import ExcelJS from 'exceljs'

export async function exportar_historial_excel(muestras: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Calizas Historial')

  const filas = muestras.map((m) => {
    const dict_flat: Record<string, string> = {}
    for (const dictItem of m.dictamenes ?? []) {
      dict_flat[`Dictamen ${dictItem.nombre}`] = dictItem.estado
    }
    const r3 = (v: unknown) => (v ? Math.round(Number(v) * 1000) / 1000 : null)
    return {
      'ID Muestra': m.id_muestra,
      'CaCO3 (%)': m.caco3,
      'CaO (%)': m.cao,
      'MgO (%)': m.mgo,
      'SiO2 (%)': m.sio2,
      'Fe2O3 (%)': m.fe2o3,
      'Al2O3 (%)': m.al2o3,
      'LSF': r3(m.lsf),
      'SO3 (%)': m.so3,
      'Na2O (%)': m.na2o,
      'K2O (%)': m.k2o,
      'P2O5 (%)': m.p2o5,
      'Pb (ppm)': m.pb,
      'Cd (ppm)': m.cd,
      'As (ppm)': m.as_ppm,
      'DRX': m.drx,
      'Petrografía': m.petrografia,
      'LOI (%)': r3(m.loi),
      'Residuo Insoluble (%)': r3(m.res_insol),
      'Alcalis (Na2Oeq) (%)': r3(m.alcalis),
      'C3S (Alita) (%)': m.c3s,
      'C2S (Belita) (%)': m.c2s,
      'C3A (%)': m.c3a,
      'C4AF (%)': m.c4af,
      'Modulo de Silice (SM)': r3(m.sm),
      'Modulo de Alumina (AM)': r3(m.am),
      'Estado Evaluacion': m.estado_eval,
      'Archivo Fuente': m.archivo_fuente,
      'Fecha Registro': m.fecha_registro,
      ...dict_flat,
    }
  })

  // Union de headers en orden: fijas primero, luego las columnas "Dictamen *" dinámicas
  const headers: string[] = []
  const fijas = [
    'ID Muestra', 'CaCO3 (%)', 'CaO (%)', 'MgO (%)', 'SiO2 (%)', 'Fe2O3 (%)', 'Al2O3 (%)', 'LSF',
    'SO3 (%)', 'Na2O (%)', 'K2O (%)', 'P2O5 (%)', 'Pb (ppm)', 'Cd (ppm)', 'As (ppm)', 'DRX',
    'Petrografía', 'LOI (%)', 'Residuo Insoluble (%)', 'Alcalis (Na2Oeq) (%)', 'C3S (Alita) (%)',
    'C2S (Belita) (%)', 'C3A (%)', 'C4AF (%)', 'Modulo de Silice (SM)', 'Modulo de Alumina (AM)',
    'Estado Evaluacion', 'Archivo Fuente', 'Fecha Registro',
  ]
  const dictHeaders = [...new Set(filas.flatMap((f) => Object.keys(f).filter((k) => k.startsWith('Dictamen '))))]
  headers.push(...fijas, ...dictHeaders)

  ws.addRow(headers)
  for (const f of filas) {
    ws.addRow(headers.map((h) => f[h] ?? null))
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}