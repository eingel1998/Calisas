# Design: Navegación de Análisis + Vista de Resultados (Evaluación Geoquímica)

**Fecha:** 2026-08-10
**Rama:** ui-guidelines-review
**Estado:** Aprobado por usuario (dirección "vista=resultados, entrada=modales")

## Contexto

La app calizas tiene un sidebar plano (Dashboard / Evaluar Muestra / Historial) y la vista "Evaluar Muestra" es un formulario centrado con 3 pestañas superiores (Procesar PDF/Imagen, Entrada Manual, Carga por Lote). Ese patrón es de herramienta (estilo Streamlit): la vista ES el formulario.

**Decisión de dirección (usuario):** la vista debe mostrar *data analizada* (resultados), y la toma de datos debe ser una acción puntual (botón → modal). Además el sidebar debe soportar las futuras vistas de análisis con un menú colapsable.

## Alcance

### 1. Sidebar colapsable (`SidebarNav.vue`)

Ítems:
- **Dashboard** — plano, sin cambios
- **Evaluar Muestra** — colapsable (chevron ▾/▸) con sub-ítems:
  - **Evaluación geoquímica** (activo por defecto al expandir) — vista existente, ahora de resultados
  - **Análisis Petrografía** — vista Coming Soon (experimental)
  - **Análisis de propiedades térmicas** — vista Coming Soon (experimental)
- **Historial** — plano, sin cambios

### 2. Vista "Evaluación geoquímica" = panel de resultados (refactor de `EvaluarView`)

- **Header de acciones:** 3 botones de entrada — "PDF/Imagen", "Manual", "Lote" — cada uno abre su modal
- **Tarjeta de la evaluación más reciente:** veredicto APTO/NO APTO, LSF, SM, fases Bogue (barritas), perfiles industriales — el contenido que hoy vive en `SampleDrawer`, ahora como vista principal con espacio
- **Tabla de muestras evaluadas:** click → la tarjeta muestra ese detalle
- **Estado vacío:** elegante, con los botones de entrada visibles

### 3. Entrada = 3 modales

- **Modal "Procesar PDF / Imagen"** — mini-wizard de 2 pasos:
  1. Subir y procesar: dropzone + toggle "Conversión a Base Seca" + LOI → "Extraer y Evaluar"
  2. Revisar y guardar: warnings + formulario editable con valores extraídos (extras en accordion) → "Guardar y Registrar"
  - Al guardar: cierra modal, limpia estado, refresca lista, la vista muestra la evaluación nueva
- **Modal "Entrada Manual"** — 1 paso: formulario químico (extras en accordion) → "Calcular y Guardar"
- **Modal "Carga por Lote"** — 1 paso: dropzone Excel/CSV → "Procesar y Guardar Lote"

### 4. Vista Coming Soon (1 componente reutilizable)

Icono + título + "Próximamente — análisis experimental" para Petrografía y Térmicas.

## Fuera de alcance (posterior, a planear)

- API modelo de visión + system prompt
- Campo "Coordenadas y dirección (específica) de muestreo" en el formulario
- Contenido real de Petrografía / Térmicas

## Arquitectura de componentes

```
SidebarNav            — colapsable, emite { tab, subAnalisis }
app.vue (shell)       — estado activeTab/subTab, orquesta modales, debounce de fetch
EvaluarView → vista de resultados:
  ResultCard          — tarjeta detalle evaluación (veredicto, LSF, SM, Bogue, perfiles)
  SamplesTable        — tabla de muestras (click → detalle)
  EmptyState          — estado vacío con botones de entrada
  ComingSoonView      — placeholder experimental (reutilizable)
Modales de entrada (reutilización del contenido actual):
  EvaluarPdfModal     — 2 pasos (drag-zone + revisión)
  EvaluarManualModal  — formulario 1 paso
  EvaluarBatchModal   — 1 paso
SampleDrawer          — se reemplaza por ResultCard (su contenido migra a la vista; el componente se elimina)
ConfirmDeleteModal    — se mantiene
```

## Flujo de datos

- `activeTab`: `dashboard | evaluar | historial` (sin cambios)
- `subTab` (nuevo): `geo | petrografia | termicas` — selecciona la vista de análisis dentro de Evaluar Muestra
- `analisisTab` (nuevo): dentro de `geo` — qué muestra está seleccionada en la tarjeta
- Modales: `modalPdfOpen / modalManualOpen / modalBatchOpen` en el shell (o un solo `modalType: 'pdf'|'manual'|'batch'|null`)
- Al guardar desde un modal: emit → shell hace POST → `fetchHistorial()` → setea la muestra más reciente como activa en la tarjeta → cierra modal

## Error handling

- Mantener los toasts existentes (`useToast()` — ya funciona con UApp)
- Estado vacío cuando `samples.length === 0`
- Loading states en botones de modal durante POST (`:loading` ya existe)

## Testing

- `nuxi build` debe pasar
- `npx vitest run` — 18/18 tests existentes (server) sin cambios
- Verificación manual del flujo: subir PDF → revisar → guardar → la vista muestra la evaluación

## Notas

- Los colores se mantienen semánticos (fix ya aplicado en esta rama)
- No se pierde la capacidad de corregir OCR antes de guardar (el paso 2 del modal)
- Los modales reutilizan los formularios que hoy están en `EvaluarPdfTab.vue`, `EvaluarManualForm.vue`, `EvaluarBatchTab.vue` — se extraen a modales, el componente de entrada se elimina