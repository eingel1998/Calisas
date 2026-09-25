# Evaluación geoquímica de calizas

Aplicación Nuxt/Nitro para revisar muestras contra una matriz de 17 usos industriales. Los resultados expresan cumplimiento de los criterios configurados; no constituyen certificación normativa.

## Ejecutar

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Node 20+. SQLite local (`calizas.db`) por defecto; `TURSO_URL` y `TURSO_TOKEN` permiten usar libSQL remoto. Las migraciones son aditivas y no recalculan registros previos.

## Ingreso y análisis

La navegación de análisis tiene tres pestañas: **Análisis Petrografía**, **Evaluación geoquímica** y **Análisis de propiedades térmicas**. Dentro de geoquímica están FRX por PDF, entrada manual, carga masiva y registro de fases DRX. Cada muestra puede tener **coordenadas** (indica sistema de referencia y zona si son UTM) y **dirección específica de muestreo**. Se capturan en PDF/manual o en columnas del lote, se editan desde el detalle y se exportan al Excel.

- PDF de tabla XRF Omnian (`Sample results`, como M7 T): extrae compuestos, valores, unidades e ID; conserva también los elementos no usados por los perfiles.
- Entrada manual: datos químicos y ensayos opcionales.
- Lote CSV/XLSX: columna `ID Muestra` y composición (`CaCO3`, `CaO`, `MgO`, `SiO2`, `Fe2O3`, `Al2O3`, `SO3`, `Na2O`, `K2O`, `P2O5`, `Pb`, `Cd`, `As`). Se admiten subíndices y unidades en encabezados. Ensayos: `PN`, `Blancura`, `TamanoParticula`, `Humedad`, `CaODisponible`, `CaOReactivo`, `Resistencia`, `Absorcion`, `LOI`. El formato antiguo XLS no es compatible.

Seleccionar explícitamente la base del informe y de las trazas. La suma de óxidos solo ofrece un indicio: no confirma la base. La conversión a seca requiere base calcinada confirmada y LOI medido o una estimación seleccionada explícitamente. Un LOI medido igual a cero se conserva. Las trazas solo se convierten cuando se declara su base calcinada.

Una celda vacía significa dato ausente, nunca cero. Los límites de detección del PDF se conservan como texto y requieren interpretación. Se rechazan valores inválidos, negativos o fuera del rango de su unidad. Se compara con precisión original y operadores estrictos; el redondeo de presentación no altera el dictamen.

Los valores estimados se muestran como informativos y no sustituyen mediciones necesarias. No se asignan automáticamente mineralogía, petrografía ni PN. Las fases de Bogue no se calculan para esta evaluación de roca; las relaciones LSF/SM/AM no equivalen a aptitud industrial.

## Dictámenes e históricos

Cada perfil muestra criterios, valores, unidades, límites, procedencia y pendientes. Un incumplimiento demostrado prevalece, sin ocultar los ensayos faltantes. Si falta base, medición o verificación de una condición necesaria, se muestra `Requiere ensayos`. Las condiciones cualitativas de la matriz que no tienen una regla verificable permanecen pendientes; no existe aprobación manual de esas condiciones en esta versión.

Resumen, detalle, historial y Excel usan los mismos dictámenes. Los registros anteriores se identifican como históricos y mantienen sus resultados sin recálculo. No se puede crear una segunda muestra con el mismo ID; tampoco se incluye reevaluación masiva. Un lote inválido o con ID duplicado no se guarda parcialmente.

Desde el detalle de una muestra actual se pueden editar los valores de entrada y la base analítica. La aplicación recalcula los dictámenes al guardar y conserva la fecha de registro, el PDF de evidencia y los análisis de secciones delgadas/DRX. Si otro usuario modificó la muestra, se pide recargar antes de guardar. Los registros históricos sin entradas originales verificables siguen siendo de solo lectura.

## DRX y FRX

**FRX/XRF** registra composición química: el informe PDF de resultados puede extraerse en la pestaña FRX o sus valores pueden introducirse manualmente. **DRX/XRD** registra las fases cristalinas identificadas por un laboratorio en la pestaña DRX. El porcentaje de una fase es opcional y solo debe anotarse si el laboratorio lo cuantificó; no se deduce de las fotografías. Los datos DRX se guardan por muestra y se pueden corregir desde el mismo formulario. DRX y petrografía no sustituyen mediciones FRX ni alteran automáticamente los dictámenes industriales.

**Propiedades térmicas** registra por muestra una medición TGA/DTG, DSC, DTA o TGA-DSC: laboratorio, fecha, atmósfera, tasa de calentamiento, intervalo de temperaturas, temperatura de un evento, pérdida de masa y observaciones. Todos los números son resultados de ensayo opcionales; la aplicación no los estima desde química o imágenes. El formulario permite corregir el registro guardado.

## Petrografía de secciones delgadas

En **Evaluar Muestra → Análisis Petrográfico**, selecciona una muestra ya registrada, añade hasta cuatro fotografías JPEG/PNG/WEBP (máximo 8 MiB cada una), indica si cada imagen es LP/PPL o NX/XPL y completa el contexto disponible. **Generar borrador** usa el SDK de OpenAI con cualquier proveedor compatible con `/chat/completions` y un modelo que acepte imágenes. Configura `PETROGRAFIA_API_KEY`, `PETROGRAFIA_BASE_URL` y `PETROGRAFIA_MODEL` en el servidor; las dos primeras toman `LLM_API_KEY` y `LLM_BASE_URL` si se omiten. Las antiguas `OPENAI_API_KEY` y `OPENAI_PETROGRAFIA_MODEL` siguen admitidas. Sin URL configurada se usa OpenAI; el modelo predeterminado es `gpt-4.1`. Las fotografías se envían al proveedor elegido únicamente al generar el borrador. Revisa el texto antes de guardarlo y marca **Revisado por especialista** solo tras validación humana. El informe y las imágenes se conservan vinculados a la muestra; eliminar la muestra también los elimina.

El análisis visual es preliminar: una fotografía puede no permitir identificar mineralogía, estimar porcentajes o reconstruir un ambiente deposicional. El informe petrográfico no modifica los dictámenes geoquímicos.

## Evidencia PDF

Desde el detalle de una muestra se puede adjuntar un PDF (por ejemplo, M7 E), confirmando su correspondencia. Se guarda como BLOB en libSQL y se descarga por identificador de muestra. Un archivo por muestra, hasta 10 MiB. La sustitución requiere confirmación. Un fallo al adjuntar no elimina la evaluación.

El PDF se valida para apertura, pero no se digitaliza ni participa en los cálculos. El servidor admite 10 MiB; el límite de petición de la plataforma de despliegue puede ser inferior y debe comprobarse antes de publicar. El listado consulta solo metadatos del adjunto.

## Código

- `server/utils/calculos.ts`: extracción, validación, conversiones y matriz de perfiles.
- `server/utils/db.ts`: almacenamiento, migraciones y transacciones.
- `server/utils/pdf.ts` y `evidencia.ts`: lectura y validación PDF.
- `server/utils/lote.ts` y `excel.ts`: importación y exportación.
- `app/app.vue`: revisión, historial y evidencia.

La exportación contiene historial, dictámenes, criterios, originales y valores usados, conservando ceros, vacíos y precisión. Las pruebas cubren regresiones del motor, exportación, lotes, históricos y evidencia con base temporal.
