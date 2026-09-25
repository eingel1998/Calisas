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

- PDF de tabla XRF Omnian (`Sample results`, como M7 T): extrae compuestos, valores, unidades e ID; conserva también los elementos no usados por los perfiles.
- Entrada manual: datos químicos y ensayos opcionales.
- Lote CSV/XLSX: columna `ID Muestra` y composición (`CaCO3`, `CaO`, `MgO`, `SiO2`, `Fe2O3`, `Al2O3`, `SO3`, `Na2O`, `K2O`, `P2O5`, `Pb`, `Cd`, `As`). Se admiten subíndices y unidades en encabezados. Ensayos: `PN`, `Blancura`, `TamanoParticula`, `Humedad`, `CaODisponible`, `CaOReactivo`, `Resistencia`, `Absorcion`, `LOI`. El formato antiguo XLS no es compatible.

Seleccionar explícitamente la base del informe y de las trazas. La suma de óxidos solo ofrece un indicio: no confirma la base. La conversión a seca requiere base calcinada confirmada y LOI medido o una estimación seleccionada explícitamente. Un LOI medido igual a cero se conserva. Las trazas solo se convierten cuando se declara su base calcinada.

Una celda vacía significa dato ausente, nunca cero. Los límites de detección del PDF se conservan como texto y requieren interpretación. Se rechazan valores inválidos, negativos o fuera del rango de su unidad. Se compara con precisión original y operadores estrictos; el redondeo de presentación no altera el dictamen.

Los valores estimados se muestran como informativos y no sustituyen mediciones necesarias. No se asignan automáticamente mineralogía, petrografía ni PN. Las fases de Bogue no se calculan para esta evaluación de roca; las relaciones LSF/SM/AM no equivalen a aptitud industrial.

## Dictámenes e históricos

Cada perfil muestra criterios, valores, unidades, límites, procedencia y pendientes. Un incumplimiento demostrado prevalece, sin ocultar los ensayos faltantes. Si falta base, medición o verificación de una condición necesaria, se muestra `Requiere ensayos`. Las condiciones cualitativas de la matriz que no tienen una regla verificable permanecen pendientes; no existe aprobación manual de esas condiciones en esta versión.

Resumen, detalle, historial y Excel usan los mismos dictámenes. Los registros anteriores se identifican como históricos y mantienen sus resultados sin recálculo. No es posible sobrescribirlos usando el mismo ID; tampoco se incluye reevaluación masiva. Un lote inválido o con ID duplicado no se guarda parcialmente.

## Petrografía de secciones delgadas

En **Evaluar Muestra → Análisis Petrográfico**, selecciona una muestra ya registrada, añade hasta cuatro fotografías JPEG/PNG/WEBP (máximo 8 MiB cada una), indica si cada imagen es LP/PPL o NX/XPL y completa el contexto disponible. **Generar borrador con OpenAI** requiere `OPENAI_API_KEY` configurada solo en el servidor; `OPENAI_PETROGRAFIA_MODEL` permite cambiar el modelo (por defecto `gpt-4.1`). Las fotografías se envían a la API de OpenAI únicamente al generar el borrador. Revisa el texto antes de guardarlo y marca **Revisado por especialista** solo tras validación humana. El informe y las imágenes se conservan vinculados a la muestra; eliminar la muestra también los elimina.

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
