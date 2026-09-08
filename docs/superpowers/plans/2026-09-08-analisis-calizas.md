# Corrección del análisis de calizas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in this session. Steps use checkbox syntax for tracking. No delegation is necessary.

**Goal:** Evaluar los 17 usos sin falsos ceros ni veredictos contradictorios, preservar históricos y permitir consultar un PDF de evidencia.

**Architecture:** Mantener el motor existente en calculos.ts y el flujo Nuxt/Nitro. Transportar datos originales y procedencia hasta libSQL; obtener el resumen exclusivamente de dictámenes. Adjuntar evidencia mediante una tabla independiente sin intervenir en los cálculos.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, libSQL, pdfjs-dist, ExcelJS, Vitest; dependencias existentes.

**Spec:** ../specs/2026-09-08-analisis-calizas-design.md (aprobada por el usuario).

## Global Constraints

- Orden: análisis, presentación, evidencia.
- No cambiar umbrales normativos sin validación técnica separada; cumplimiento de criterios configurados no equivale a certificación.
- Ausente es null; cero es una medición explícita de cero.
- Mantener precisión para comparar; redondear solamente al mostrar.
- Conservar valores originales, usados y procedencia; no recalcular históricos al leer.
- No agregar dependencias, OCR, análisis espectral, autenticación ni rediseño general.
- Un PDF de evidencia por muestra, máximo 10 MiB, persistido como BLOB.
- No tocar .vercel/ ni datos del usuario. Pruebas de persistencia en una base temporal.

## Archivos y contratos

Modificar server/utils/types.ts, calculos.ts, pdf.ts, lote.ts, db.ts, excel.ts; endpoints actuales de extracción, evaluación, lote e historial; app/app.vue y README.md. Ampliar calculos.test.ts. Crear server/utils/analisis-integracion.test.ts y server/utils/evidencia.test.ts para comprobaciones de persistencia y adjuntos. Crear server/api/historial/[id]/evidencia.post.ts y evidencia.get.ts; la validación del PDF reutiliza pdf.ts.

No dividir app.vue por motivos ajenos a esta corrección. Mantener las claves de composición actuales y sus campos planos para los consumidores existentes; convertir sus tipos a number | null.

Añadir en types.ts el siguiente contrato de procedencia:

```ts
export type BaseAnalitica = 'desconocida' | 'seca' | 'calcinada'
export interface DatoOriginal {
  compuesto: string
  texto: string
  unidad: string
  valor: number | null
}
export interface ContextoAnalisis {
  base: BaseAnalitica
  originales: DatoOriginal[]
  procedencia: Record<string, 'medido' | 'calculado' | 'estimado'>
  convertir: boolean
  estimar_loi: boolean
  loi: number | null
  base_trazas: BaseAnalitica
}
export interface ResumenUsos {
  aptos: number
  no_aptos: number
  pendientes: number
}
```

Contexto recibido se valida en servidor; nunca confiar en una etiqueta de procedencia enviada para certificar una medición. Derivaciones realizadas por el motor generan su propia procedencia. La revisión manual conserva el original y registra el valor utilizado.

Extender PerfilDictamen con criterios: arreglo de { campo, etiqueta, valor: number | null, unidad, op, limite, estado, procedencia } y pendientes: string[]. ResultadoEvaluacion añade version_evaluacion: 2, contexto y resumen: ResumenUsos | null. El resultado histórico conserva su JSON; resumen null significa no disponible.

### Tarea 1: Extracción fiel y entradas sin falsos ceros

**Archivos:** types.ts, calculos.ts, pdf.ts, lote.ts, calculos.test.ts.
**Consume:** tablas Compound/Conc/Unit y celdas de entrada existentes.
**Produce:** datos numéricos anulables, originales completos y validar_numero(valor, campo, maximo): number | null.

- [ ] Añadir regresión M7 real a calculos.test.ts:

```ts
it('conserva M7 y distingue ausencias', () => {
  const d = parsear_reporte_xrf(`M7\nSample ident\nCompound MgO Al2O3 SiO2 K2O CaO Fe2O3 As\nConc 0,314 0,802 2,266 0,187 95,843 0,507 2,9\nUnit % % % % % % ppm\nCompound Pb Sn\nConc 3,0 115,2\nUnit ppm ppm`)!
  expect(d.cao).toBe(95.843)
  expect(d.as_ppm).toBe(2.9)
  expect(d.pb).toBe(3)
  for (const k of ['cd', 'na2o', 'so3', 'p2o5', 'caco3']) expect(d[k]).toBeNull()
  expect(d.originales.find(x => x.compuesto === 'Sn')?.valor).toBe(115.2)
})
```

- [ ] Ejecutar npm test -- server/utils/calculos.test.ts; confirmar fallo de la nueva expectativa, sin modificar tests para aceptar ceros ausentes.
- [ ] Sustituir defaults numéricos del parser por null. Conservar todas las columnas originales. Rechazar filas con distinta cardinalidad y duplicados contradictorios; no truncar con Math.min. No aceptar parseFloat parcial. Un resultado como '<0,1' mantiene texto y valor null. Una tabla sin concentraciones numéricas utilizables no es una extracción exitosa.
- [ ] Aplicar esta validación a números ordinarios, usando límites por unidad; ensayos en MPa o µm solo requieren finitud y no negatividad:

```ts
export function validar_numero(v: unknown, campo: string, maximo = Infinity): number | null {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return null
  if (typeof v !== 'number' && typeof v !== 'string') throw new Error(`${campo}: número inválido`)
  const s = typeof v === 'string' ? v.trim().replace(',', '.') : String(v)
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw new Error(`${campo}: número inválido`)
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0 || n > maximo) throw new Error(`${campo}: fuera de rango`)
  return n
}
```

- [ ] Probar '', null, 0, '0,314', '12abc', NaN, Infinity y un porcentaje 101. Separar el tratamiento de '<…' del validador ordinario: conservarlo como no cuantificado en la tabla PDF y rechazarlo como número manual.
- [ ] Verificar extracción con pdfjs-dist sobre M7 T, no solo sobre el fixture. Corregir separación espacial usando las posiciones de los items si la concatenación actual mezcla columnas. M7 E solo debe informar que no contiene una tabla extraíble.
- [ ] Ejecutar las pruebas focalizadas y registrar este bloque con un commit limitado a sus archivos.

### Tarea 2: Conversiones explícitas y un único dictamen por uso

**Archivos:** calculos.ts, types.ts, calculos.test.ts.
**Consume:** composición anulable y ContextoAnalisis.
**Produce:** calcular_evaluacion con contexto opcional al final de su firma existente; resumir_dictamenes(dictamenes): ResumenUsos | null exportado por calculos.ts.

- [ ] Añadir pruebas que fallen: LOI cero medido, LOI 43 conservado, base desconocida pendiente, insumos ausentes sin cálculo, PN ausente pendiente, límite estricto igual y a ambos lados.

```ts
it('no redondea antes del límite y mantiene pendientes', () => {
  const vidrio = (fe2o3: number | null) => evaluar_perfiles({ caco3: 99, fe2o3 })
    .find(p => p.nombre === 'Industria del vidrio')!
  expect(vidrio(0.0499).estado).toBe('Apto')
  expect(vidrio(0.05).estado).toBe('No Apto')
  expect(vidrio(0.0501).estado).toBe('No Apto')
  expect(vidrio(null).estado).toBe('Requiere ensayos')
})
```

- [ ] Ejecutar prueba focalizada. Eliminar safeFloat con redondeo del camino de comparación; toda derivación sin insumos suficientes retorna null. Divisor cero produce resultado no disponible, no módulo cero.
- [ ] Separar conversión de cálculo: partir siempre de originales, comprobar base confirmada y opción convertir. LOI medido usa comprobación != null; estimarlo únicamente si estimar_loi es true. Con base desconocida no convertir ni concluir cumplimiento de porcentajes dependientes de base. No convertir trazas salvo base_trazas confirmada calcinada.

```ts
const factor = loi != null ? (100 - loi) / 100 : null
const convertido = valor == null || factor == null ? null : valor * factor
```

- [ ] Preservar la fórmula de estimación existente solo como cálculo explícito; no recortar un CaCO₃ calculado superior a 100 para ocultar inconsistencia. Marcar ese cálculo como no utilizable y explicar la incompatibilidad de supuestos. Datos estimados que sustituyen mediciones requeridas dejan el criterio pendiente; mostrar su valor informativo.
- [ ] Mantener operadores y límites existentes. Extender evaluación por criterio; acumular fallas y faltantes simultáneamente. Convertir las notas de granulometría y reactividad necesarias en pendientes explícitos. Revisar cada fila de la matriz del Excel para condiciones necesarias no representadas, sin crear umbrales nuevos. Mantener fuera del Apto definitivo cualquier condición requerida sin evidencia verificable.
- [ ] Retirar estado_eval binario del resultado nuevo (guardar null para compatibilidad SQL). No usar errores_norma/cumple_norma para decidir usos. Para roca, retornar fases Bogue sin resultado y explicar no aplicabilidad; mantener módulos solo como relaciones calculadas con insumos suficientes, sin afirmar rango óptimo del material por ese cálculo.
- [ ] Implementar recuento único y rechazar arreglo incompleto/corrupto como resumen no disponible:

```ts
export function resumir_dictamenes(ds: PerfilDictamen[] | null): ResumenUsos | null {
  if (!ds || ds.length !== 17 || new Set(ds.map(d => d.nombre)).size !== 17) return null
  if (ds.some(d => !['Apto', 'No Apto', 'Requiere ensayos'].includes(d.estado))) return null
  return {
    aptos: ds.filter(d => d.estado === 'Apto').length,
    no_aptos: ds.filter(d => d.estado === 'No Apto').length,
    pendientes: ds.filter(d => d.estado === 'Requiere ensayos').length,
  }
}
```

- [ ] Confirmar nombres contra PERFILES_INDUSTRIALES además de cantidad y unicidad. Ejecutar pruebas focalizadas, actualizar expectativas antiguas que codificaban el defecto y hacer commit del motor.

### Tarea 3: Conservar análisis al guardar y exportar

**Archivos:** db.ts, evaluar.post.ts, procesar-pdf.post.ts, procesar-lote.post.ts, historial.get.ts, excel.ts, analisis-integracion.test.ts.
**Consume:** ResultadoEvaluacion versión 2.
**Produce:** historial con contexto, versión y resumen; exportación fiel; errores HTTP 400 y 409 identificables.

- [ ] Añadir test con cliente libSQL temporal: crear esquema antiguo, insertar muestra histórica, ejecutar migración dos veces, leerla y comprobar igualdad de columnas anteriores. Permitir cliente inyectado opcional en las funciones de DB para esta prueba, manteniendo el cliente real como default.

```ts
const antes = await testClient.execute('SELECT * FROM muestras WHERE id_muestra = ?', ['historica'])
await ensureSchema(testClient)
await ensureSchema(testClient)
const despues = await testClient.execute('SELECT * FROM muestras WHERE id_muestra = ?', ['historica'])
for (const key of Object.keys(antes.rows[0])) expect(despues.rows[0][key]).toEqual(antes.rows[0][key])
```

- [ ] Ejecutar el test y añadir columnas contexto_json y version_evaluacion mediante PRAGMA table_info + ALTER TABLE solo si faltan. No hacer UPDATE masivo. Cambiar INSERT OR REPLACE por INSERT y devolver 409 si el ID ya existe. No agregar flujo de reevaluación en esta entrega.
- [ ] Validar datos antes de registrar: identificador no vacío, campos numéricos y base/contexto coherentes. API manual, PDF y lote comparten la validación del motor. En lote validar todas las filas antes de escribir y registrar en transacción; un error debe identificar fila/campo y no producir guardado parcial invisible.
- [ ] El endpoint PDF devuelve originales y propuesta editable sin conversión automática. Evaluar recibe contexto y realiza la conversión una sola vez a partir de esos originales revisados; guardar LOI y procedencia calculados. Quitar defaults de DRX y petrografía.
- [ ] Leer JSON con validación: un JSON inválido no se convierte en [] satisfactorio. Marcar version_evaluacion ausente como histórica y resumen no disponible cuando corresponda. No invocar calcular_evaluacion desde historial ni exportación.
- [ ] Excel conserva cero usando v == null, no truthiness. Añadir recuentos, versión, base, procedencia y motivos/pendientes por uso; hojas de originales y criterios detallados si excede legibilidad del historial. No reemplazar valores históricos ni redondear el contenido numérico de origen.

```ts
it('exporta cero y ausencia sin confundirlos', async () => {
  const bytes = await exportar_historial_excel([{ id_muestra: 'cero', loi: 0, cd: null, dictamenes: [] }])
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes)
  const ws = wb.worksheets[0]
  const headers = ws.getRow(1).values as string[]
  expect(ws.getRow(2).getCell(headers.indexOf('LOI (%)')).value).toBe(0)
  expect(ws.getRow(2).getCell(headers.indexOf('Cd (ppm)')).value).toBeNull()
})
```

- [ ] Probar round trip de LOI 0/43, null y precisión M7, ID duplicado sin cambios previos y dictámenes históricos. Ejecutar npm test y hacer commit del bloque.

### Tarea 4: Presentación coherente y fórmulas

**Archivos:** app/app.vue, excel.ts, README.md.
**Consume:** resumen y dictámenes recibidos del servidor; no introduce evaluación en cliente.
**Produce:** flujo revisable para PDF/manual/lote y presentación consistente.

- [ ] Leer skill vue-best-practices antes de editar Vue. Localizar todos los usos de estado_eval, || 0, defaults geológicos, toFixed y etiquetas químicas.
- [ ] Sustituir encabezado, tarjetas y columnas binarias por tres recuentos. Filtro: Todos, Con usos aptos, Con incumplimientos, Con ensayos pendientes; comprobar el recuento correspondiente > 0. Resultado no disponible se muestra sin recuentos verdes. Históricos llevan etiqueta visible.

```vue
<span v-if="sample.resumen">
  {{ sample.resumen.aptos }} cumplen · {{ sample.resumen.no_aptos }} incumplen ·
  {{ sample.resumen.pendientes }} requieren ensayos
</span>
<span v-else>Resultado no disponible</span>
```

- [ ] Mostrar tabla de criterios por uso con valor, unidad, límite, procedencia y pendientes. Eliminar texto de certificación normativa y banner general de cemento. Ocultar Bogue para versión 2 roca, explicar aplicabilidad; históricos conservan lectura identificada como anterior.
- [ ] Formularios vacíos envían null, no cero; seleccionar base explícitamente. Opciones de conversión/estimación desactivadas inicialmente; preservar LOI cero. Mostrar originales al revisar PDF y distinguirlos de datos usados. Lote ofrece base común explícita para sus filas y muestra errores de fila antes del guardado.

```ts
const mostrarNumero = (v: number | null | undefined) => v == null ? 'Sin dato' : String(v)
const pdfOptions = ref({ base: 'desconocida', convertir: false, estimar_loi: false, loi_manual: null })
```

- [ ] Usar etiquetas Unicode explícitas CaCO₃/SiO₂/etc. en UI, motor y Excel. Para textos existentes usar mapa limitado de fórmulas, no una sustitución general de dígitos. Normalizar subíndices a ASCII en encabezados importados de lote para conservar compatibilidad.
- [ ] Eliminar accept image/* de la carga de tabla PDF mientras no exista OCR. Mostrar error.statusMessage/data.statusMessage según la respuesta real del endpoint; no éxito genérico sin tabla válida.
- [ ] Verificar en navegador: M7 pendiente con base desconocida; revisión explícita; una muestra manual con cero; resumen/detalle/historial/Excel iguales; histórico sin cambios; mensajes y subíndices legibles. Actualizar README con semántica y límites reales. Ejecutar npm run build y commit.

### Tarea 5: Evidencia PDF al final del análisis

**Archivos:** db.ts, pdf.ts, evidencia.post.ts, evidencia.get.ts, evidencia.test.ts, app/app.vue.
**Consume:** ID de muestra existente y PDF confirmado por el usuario.
**Produce:** POST/GET /api/historial/:id/evidencia; metadata disponible en detalle sin cargar BLOB en listado.

- [ ] Añadir test de tamaño, contenido corrupto, descarga idéntica, muestra inexistente y sustitución sin autorización. Usar M7 E solo para comprobación local; no commitear los informes privados. Para tests crear un PDF mínimo válido en el fixture de texto de test, con offsets xref calculados.
- [ ] Crear tabla aditiva:

```sql
CREATE TABLE IF NOT EXISTS evidencias (
  id_muestra TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  contenido BLOB NOT NULL,
  fecha TEXT NOT NULL
);
```

- [ ] En pdf.ts exportar validar_pdf_evidencia(bytes: Uint8Array): Promise<void>. Comprobar 1..10*1024*1024 bytes, cabecera %PDF- y apertura mediante getDocument existente; exigir al menos una página y destruir documento en finally. No extraer ni ejecutar contenido. La validación no equivale a sanitización.
- [ ] POST multipart exige file y confirmacion=true. Rechazar >10 MiB con 413, contenido inválido con 400, muestra inexistente con 404 y evidencia existente con 409 salvo reemplazar=true. Comprobar existencia y escritura en una transacción. Detectar Content-Length excesivo antes de leer cuando exista y comprobar tamaño real tras lectura; revisar límite del despliegue antes de afirmar que admite 10 MiB.
- [ ] GET obtiene BLOB exclusivamente por parámetro SQL. Servir application/pdf, Content-Disposition attachment con filename codificado y X-Content-Type-Options nosniff. No usar nombre de archivo como ruta. Abrir el PDF descargado localmente desde el navegador satisface consulta sin renderizar contenido no sanitizado en el origen de la app.
- [ ] Al borrar muestra, borrar evidencia en la misma transacción explícita. Evitar BLOB huérfano; el listado solo lee nombre/fecha mediante consulta de metadata.
- [ ] Agregar en detalle selector PDF y confirmación de correspondencia, botón Adjuntar, enlace Descargar y confirmación explícita al sustituir. Guardar muestra antes del adjunto, conservar estado guardado y permitir reintentar si falla la evidencia.

```ts
expect(Buffer.from(descargado)).toEqual(Buffer.from(original))
expect(await leerDictamenes(id)).toEqual(dictamenesAntesDelAdjunto)
```

- [ ] Ejecutar pruebas de evidencia y comprobación real con M7 E. No asumir que Vercel/local ofrece el mismo límite multipart: documentar un límite inferior observado como restricción de despliegue, sin añadir infraestructura no autorizada. Commit final del bloque.

## Cierre y revisión propia

- [ ] npm test; npm run build; git diff --check.
- [ ] Confirmar con M7 T: originales intactos y faltantes conservados; no inventar un dictamen definitivo sin base y ensayos necesarios.
- [ ] Descargar Excel y evidencia; inspeccionar recuentos, null, cero, precisión y bytes.
- [ ] Confirmar que históricos y archivos ajenos no cambiaron; no desplegar ni publicar PR como parte de este plan.
- [ ] Informar cambios, verificaciones realizadas y cualquier limitación real. No declarar análisis certificado ni validación normativa nueva.

Revisión del plan: las secciones 1 y 2 del diseño quedan cubiertas por tareas 1–3; históricos por tarea 3; presentación por tarea 4; evidencia por tarea 5. Los contratos de contexto, resumen y validación están definidos arriba. Las condiciones cualitativas sin regla verificable quedan pendientes explícitamente, no se resuelven con nuevos límites.
