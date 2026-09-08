# Corrección del análisis de calizas

Fecha: 2026-09-08. Diseño funcional aprobado en conversación; esta especificación detalla el alcance para revisión antes del plan de implementación.

## Objetivo y orden

1. Corregir la evaluación y su consistencia entre todas las salidas.
2. Corregir fórmulas visibles y explicaciones de resultados.
3. Asociar el informe de espectro como evidencia consultable.

No se digitalizarán curvas, identificarán picos ni recalcularán concentraciones desde imágenes. No se cambiarán umbrales normativos sin una validación técnica separada. El resultado expresa cumplimiento de los criterios configurados, no certificación industrial.

## Evidencia y problema actual

M7 T contiene la tabla Omnian: CaO 95,843 %, MgO 0,314 %, Al₂O₃ 0,802 %, SiO₂ 2,266 %, K₂O 0,187 %, Fe₂O₃ 0,507 %, As 2,9 ppm y Pb 3,0 ppm, entre otros elementos. No reporta directamente CaCO₃, LOI, Cd, Na₂O, SO₃ ni P₂O₅. M7 E es una gráfica sin texto extraíble; muestra M7 y la misma fecha y hora de medición.

El motor calcula estado_eval con controles separados de los 17 perfiles. La interfaz lo presenta como un veredicto de cemento, aunque el perfil cementero puede aprobar. El parser, formularios y lote convierten ausencias en cero. El guardado vuelve a estimar LOI y asigna mineralogía y petrografía predeterminadas. La extracción pierde componentes no incluidos en el modelo de evaluación.

## 1. Evaluación coherente

Los 17 dictámenes serán la única fuente del resumen: número de usos que cumplen, incumplen y requieren ensayos. Resumen, detalle, filtros del historial y Excel usarán esos mismos resultados. Se elimina el veredicto binario global de cemento para nuevas evaluaciones.

Por uso se mostrarán valor, unidad, operador, límite y resultado de cada criterio. Un incumplimiento demostrado produce No Apto aunque también haya faltantes; estos se muestran. Si no hay incumplimientos pero falta evidencia necesaria, produce Requiere ensayos. Apto requiere todos los criterios necesarios satisfechos. Las etiquetas explicarán que se evalúa la matriz configurada.

Las condiciones actualmente expresadas solo como notas no deben quedar ocultas tras un Apto. Si son necesarias y no tienen ensayo o regla verificable, el uso queda pendiente y se explica cuál condición falta; no se inventan límites para resolverla.

Los controles de cemento terminado no gobiernan la clasificación de la roca. Los módulos y fases de Bogue existentes no deben presentarse como composición mineral medida de la caliza ni como certificación. Su aplicabilidad se explicita y se ocultan conclusiones no sustentadas para una muestra de roca.

## 2. Datos y conversiones

Ausente es null; cero es una medición explícita de cero. Esta distinción se conserva desde PDF, entrada manual y lote hasta base de datos y exportación. Valores inválidos, negativos o no finitos se rechazan con el campo identificado. Los porcentajes deben estar entre 0 y 100 y las concentraciones en ppm entre 0 y 1.000.000. Un texto de límite de detección no se convierte silenciosamente en número: queda pendiente de interpretación con el original visible.

Se conserva la tabla completa extraída con unidades y precisión originales, aunque solo ciertos componentes alimenten los perfiles. El redondeo de presentación no altera las comparaciones en los límites. DRX y petrografía quedan sin informar si no hay datos.

La suma de óxidos es una advertencia sobre la posible base, no una confirmación automática. La base del informe y cualquier conversión deben quedar explícitas antes de usarlas en la clasificación. Con base desconocida se conservan resultados originales y quedan pendientes los criterios cuya comparación exige una base confirmada.

Se guardan valores originales, valores usados y procedencia: medido, calculado o estimado. Un LOI medido se conserva y tiene prioridad; LOI cero es válido. Una estimación requiere selección explícita y no reemplaza ensayos medidos necesarios. CaCO₃ derivado de CaO, equivalentes, PN, azufre derivado y residuos estimados se identifican como tales; no se presentan como mediciones. El PN estimado no sustituye automáticamente un ensayo de PN.

Los cálculos con insumos ausentes quedan sin resultado, no en cero. La conversión no se aplica dos veces ni cambia unidades inadvertidamente. Las concentraciones de trazas solo se convierten de base cuando su base de reporte lo justifica.

## 3. Persistencia e históricos

Se mantiene Nuxt/Nitro y libSQL existentes, con cambios aditivos de esquema para procedencia y versión de evaluación. Se reutilizan calculos.ts, types.ts, los endpoints actuales, db.ts y excel.ts; no se crea un segundo motor.

Los registros anteriores conservan sus valores y dictámenes sin recálculo automático. Se identifican como evaluación histórica; no se intenta deducir si sus ceros eran mediciones o ausencias. El resumen puede contar sus dictámenes guardados, indicando que corresponden a reglas anteriores. Un JSON de dictámenes inválido debe mostrarse como resultado no disponible, nunca como cero incumplimientos satisfactorio.

La reevaluación exige una acción explícita con revisión de los datos y preservación del resultado anterior. No se añade una herramienta de reevaluación masiva en este alcance. Un ID repetido no debe sobrescribir silenciosamente una muestra histórica.

## 4. Presentación

Subíndices visibles en formularios, tablas, explicaciones y Excel: CaCO₃, SiO₂, Fe₂O₃, Al₂O₃, P₂O₅, Na₂O, K₂O, SO₃ y Ca(OH)₂. Las claves internas permanecen estables. No se transforman números de normas, unidades ni identificadores de muestras.

Los valores ausentes se muestran como Sin dato y los estimados con su procedencia. Los mensajes de extracción no declaran éxito si no se pudo recuperar una tabla válida. Errores de entrada llegan como errores de validación y se muestran con su causa.

## 5. Evidencia del espectro

Una muestra puede incorporar opcionalmente un archivo PDF de espectro para abrirlo o descargarlo desde su detalle. Su contenido no alimenta cálculos ni altera dictámenes. El usuario confirma la correspondencia con la muestra; el nombre por sí solo no constituye validación.

Para este alcance se propone guardar el PDF como BLOB en una tabla de evidencias de libSQL, junto con muestra, nombre, tipo y fecha, evitando depender del disco temporal de un despliegue. Máximo propuesto: un PDF de 10 MiB por muestra. Se valida tamaño y contenido PDF, y la descarga se sirve mediante un endpoint por identificador, sin usar el nombre como ruta. Un fallo de adjunto no debe borrar la evaluación. Una sustitución debe ser explícita. Estos dos límites forman parte de la revisión de este diseño.

## Verificación y aceptación

- Caso M7: extracción fiel de concentraciones y unidades; Cd, Na₂O, SO₃, P₂O₅, CaCO₃ y LOI permanecen ausentes en los originales.
- Un faltante no aprueba un límite máximo; cero explícito mantiene su significado. NaN e infinitos no llegan al motor ni a la base.
- Límites estrictos conservan operadores; comparar valor igual al límite y valores inmediatamente a ambos lados sin redondeo previo.
- LOI medido, incluido cero, sobrevive a extracción, guardado, lectura y exportación; una conversión no se repite.
- Recuento de estados idéntico en resumen, detalle, historial y Excel; los tres recuentos suman 17 en una evaluación completa.
- Ensayos pendientes y condiciones cualitativas necesarias no producen Apto automáticamente.
- Abrir históricos no modifica registros; identificar un resultado antiguo no equivale a validarlo con reglas nuevas.
- Subíndices correctos sin modificar identificadores ni claves de importación.
- Adjuntar y descargar conserva los bytes del PDF; rechazar tamaño excesivo, archivo no PDF y muestra inexistente sin perder datos.
- Usar Vitest existente para regresiones y comprobar build de Nuxt, además de revisar manualmente el flujo y la exportación.

## Fuera de alcance

OCR del espectro, reconstrucción de curvas, cuantificación espectral, nuevas normas o umbrales sin revisión, certificación de usos, rediseño general, autenticación nueva y cambios de infraestructura ajenos a persistir la evidencia.
