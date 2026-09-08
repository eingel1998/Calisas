# Arquitectura reutilizable de interfaz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estandarizar los elementos visuales y dividir la interfaz en componentes reutilizables, sin cambiar análisis, rutas API ni datos.

**Architecture:** Una capa pequeña de campos, secciones y tablas establece el diseño por defecto. Las vistas combinan componentes de dominio; `app.vue` conserva sesión, navegación, estado seleccionado y operaciones de API. La migración se hace por flujo para mantener los mismos payloads y eventos.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Nuxt UI, Tailwind CSS y Bun; dependencias existentes.

**Spec:** ../specs/2026-09-08-arquitectura-ui-design.md

## Global Constraints

- Usar Bun para build y pruebas; no usar npm.
- No agregar dependencias ni cambiar backend, cálculo, persistencia ni contratos de API.
- Los componentes base no conocen química ni hacen solicitudes de red.
- Mantener campos accesibles: etiqueta asociada, `required`, límites, ayuda y estado deshabilitado.
- Conservar los valores y payloads de formularios manual y PDF.
- `IndustrialProfiles` se muestra antes de datos del análisis en el drawer.

---

## File Structure

- Create: `app/components/ui/AppField.vue` — etiqueta normalizada y `UInput` con atributos reenviados.
- Create: `app/components/ui/AppSelect.vue` — etiqueta normalizada y `USelect` con atributos reenviados.
- Create: `app/components/ui/AppSection.vue` — encabezado, descripción y ranura de contenido.
- Create: `app/components/ui/AppTable.vue` — área horizontal, cabecera y cuerpo por ranuras.
- Create: `app/components/sample/OriginalCompositionTable.vue` — tabla de originales con `AppTable`.
- Create: `app/components/sample/IndustrialProfiles.vue` — dictámenes y criterios por perfil.
- Create: `app/components/sample/EvidenceSection.vue` — adjunto de evidencia, sin persistencia propia.
- Create: `app/components/sample/SampleDetailDrawer.vue` — organiza el detalle de una muestra.
- Modify: `app/components/SidebarNav.vue` — aplicar el ancho y estilo final sin duplicar navegación.
- Modify: `app/app.vue` — sustituir marcado repetido por los componentes y conservar orquestación.

### Task 1: Elementos base de formulario y contenido

**Files:**
- Create: `app/components/ui/AppField.vue`
- Create: `app/components/ui/AppSelect.vue`
- Create: `app/components/ui/AppSection.vue`
- Create: `app/components/ui/AppTable.vue`
- Modify: `app/app.vue`

**Interfaces:**
- `AppField`: `v-model`, `label: string`, `help?: string`; reenvía atributos a `UInput`.
- `AppSelect`: `v-model`, `label: string`, `items: unknown[]`, `help?: string`; reenvía atributos a `USelect`.
- `AppSection`: `title: string`, `description?: string`, ranura predeterminada.
- `AppTable`: `label: string`, ranuras `head` y `default`.

- [ ] **Step 1: Escribir la comprobación de contratos de componentes**

Crear `app/components/ui/ui-contract.test.ts` con lectura de archivos para asegurar que los cuatro componentes exponen sus contratos mínimos y usan los componentes Nuxt UI esperados:

```ts
import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

it('mantiene los contratos base de interfaz', () => {
  const field = readFileSync(resolve('app/components/ui/AppField.vue'), 'utf8')
  expect(field).toContain("defineModel('modelValue')")
  expect(field).toContain('<UInput')
  expect(field).toContain('label')
})
```

- [ ] **Step 2: Ejecutar la comprobación y confirmar el fallo**

Run: `bun test app/components/ui/ui-contract.test.ts`

Expected: falla porque los componentes todavía no existen.

- [ ] **Step 3: Crear la implementación mínima**

Usar esta forma para `AppField`; aplicar el mismo espaciado y colores en `AppSelect`:

```vue
<script setup lang="ts">
const modelValue = defineModel<string | number | null>({ default: null })
defineProps<{ label: string; help?: string }>()
</script>

<template>
  <label class="block text-sm font-semibold text-slate-700 mb-1.5">
    <span>{{ label }}</span>
    <UInput v-model="modelValue" class="mt-1 w-full" v-bind="$attrs" />
    <span v-if="help" class="mt-1 block text-xs text-slate-500">{{ help }}</span>
  </label>
</template>
```

`AppTable` debe envolver una tabla semántica en `overflow-x-auto`, proveer `thead` y `tbody`, y usar cabecera `bg-slate-50`, borde inferior y filas `divide-y`.

- [ ] **Step 4: Reemplazar primero los campos repetidos del formulario PDF**

En `app/app.vue`, cambiar los campos químicos editables que ya usan `UInput` y los selectores DRX/petrografía por `AppField` y `AppSelect`. Mantener exactamente los mismos `v-model`, límites y `type="number"`; no mover aún las funciones de guardar ni extracción.

- [ ] **Step 5: Verificar y confirmar el bloque**

Run: `bun test app/components/ui/ui-contract.test.ts && bun run build`

Expected: contrato y build pasan; el formulario PDF conserva sus valores y estilos coherentes.

- [ ] **Step 6: Commit**

```bash
git add app/components/ui app/app.vue
git commit -m "feat: add reusable UI primitives"
```

### Task 2: Drawer de detalle y composición legible

**Files:**
- Create: `app/components/sample/OriginalCompositionTable.vue`
- Create: `app/components/sample/IndustrialProfiles.vue`
- Create: `app/components/sample/EvidenceSection.vue`
- Create: `app/components/sample/SampleDetailDrawer.vue`
- Modify: `app/app.vue`

**Interfaces:**
- `OriginalCompositionTable` consume `originales: Array<{ compuesto: string; texto: string; unidad: string }>` y `chemicalText`.
- `IndustrialProfiles` consume `dictamenes: unknown[]`, `showNumber` y `chemicalText`.
- `EvidenceSection` consume `sample`, `file`, `confirmed`, `replace`, `loading`; emite `select`, `update:confirmed`, `update:replace`, `upload`.
- `SampleDetailDrawer` recibe `open`, `sample`, utilidades de formato y estado de evidencia; reemite los eventos de `EvidenceSection` y `update:open`.

- [ ] **Step 1: Escribir la comprobación de orden del drawer**

Crear `app/components/sample/sample-detail-contract.test.ts`:

```ts
import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

it('muestra perfiles antes de datos del análisis', () => {
  const source = readFileSync('app/components/sample/SampleDetailDrawer.vue', 'utf8')
  expect(source.indexOf('<IndustrialProfiles')).toBeLessThan(source.indexOf('Datos del análisis'))
  expect(source).toContain('<OriginalCompositionTable')
})
```

- [ ] **Step 2: Ejecutar la comprobación y confirmar el fallo**

Run: `bun test app/components/sample/sample-detail-contract.test.ts`

Expected: falla porque el drawer todavía está dentro de `app.vue`.

- [ ] **Step 3: Implementar componentes de dominio**

`OriginalCompositionTable` usa `AppSection` y `AppTable`; conserva título `Composición original completa · N componentes`, muestra `Sin componentes extraídos` cuando la lista esté vacía y no modifica los valores.

`IndustrialProfiles` conserva el contenido actual de cada detalle, tabla de criterios, pendientes y observaciones. Sus tablas usan `AppTable`.

`EvidenceSection` solo presenta y emite eventos. El input debe seguir tener `accept=".pdf,application/pdf"` y usar la muestra para generar el mismo enlace de descarga actual.

`SampleDetailDrawer` conserva `USlideover`, su ancho `sm:max-w-4xl`, encabezado, resumen, datos del análisis, metadatos, texto extraído y Bogue histórico. Inserta `IndustrialProfiles` antes de `Datos del análisis`.

- [ ] **Step 4: Sustituir el drawer inline sin cambiar su estado dueño**

En `app/app.vue`, reemplazar el `USlideover` inline por `SampleDetailDrawer`. Mantener `drawerOpen`, `selectedSample`, `evidenceFile`, `evidenceConfirmed`, `replaceEvidence`, `evidenceLoading`, `selectEvidence` y `uploadEvidence` en `app.vue` y conectarlos mediante props/eventos.

- [ ] **Step 5: Verificar y confirmar el bloque**

Run: `bun test app/components/sample/sample-detail-contract.test.ts && bun run build`

Expected: build pasa; al abrir una muestra aparecen perfiles primero, la tabla de 22 componentes tiene cabecera y puede desplazarse en móvil; adjuntar evidencia conserva la confirmación y reemplazo.

- [ ] **Step 6: Commit**

```bash
git add app/components/sample app/app.vue
git commit -m "refactor: split sample detail drawer"
```

### Task 3: Formularios químicos y navegación única

**Files:**
- Modify: `app/components/SidebarNav.vue`
- Modify: `app/app.vue`
- Modify: `app/components/ui/ui-contract.test.ts`

**Interfaces:**
- `SidebarNav` conserva props `activeTab`, `subAnalisis` y evento `navigate`.
- Los formularios manual y PDF mantienen sus objetos reactivos y callbacks actuales.

- [ ] **Step 1: Extender la comprobación de contratos para navegación y formularios**

Agregar a `ui-contract.test.ts`:

```ts
it('usa la barra lateral compartida y campos base', () => {
  const app = readFileSync(resolve('app/app.vue'), 'utf8')
  const sidebar = readFileSync(resolve('app/components/SidebarNav.vue'), 'utf8')
  expect(app).toContain('<SidebarNav')
  expect(app).toContain('<AppField')
  expect(sidebar).toContain("defineEmits(['navigate'])")
})
```

- [ ] **Step 2: Ejecutar la comprobación y confirmar el fallo**

Run: `bun test app/components/ui/ui-contract.test.ts`

Expected: falla hasta que `app.vue` use `SidebarNav` y los campos estén normalizados.

- [ ] **Step 3: Conectar la navegación compartida**

Eliminar el marcado lateral duplicado de `app.vue` y montar `SidebarNav` con:

```vue
<SidebarNav
  :active-tab="activeTab"
  :sub-analisis="subTab"
  @navigate="({ tab, subAnalisis }) => { activeTab = tab; if (subAnalisis) subTab = subAnalisis }"
/>
```

Conservar el ancho ampliado del sidebar ajustándolo en `SidebarNav.vue`, no con una segunda barra lateral.

- [ ] **Step 4: Normalizar campos restantes**

Aplicar `AppField` y `AppSelect` al formulario manual y a los ensayos opcionales que repiten etiqueta y control. Mantener campos especiales, carga de archivos, checkboxes y acciones como marcado específico. No crear un componente para botones o controles que no se repitan.

- [ ] **Step 5: Verificar el flujo y confirmar el bloque**

Run: `bun test app/components/ui/ui-contract.test.ts && bun test && bun run build`

Expected: todas las pruebas existentes y build pasan. Verificación manual: navegar por cada pestaña, cargar PDF, editar valores, guardar muestra manual, abrir historial y adjuntar evidencia.

- [ ] **Step 6: Commit**

```bash
git add app/app.vue app/components/SidebarNav.vue app/components/ui
git commit -m "refactor: standardize forms and navigation"
```

## Final Verification

- [ ] Ejecutar `bun test`.
- [ ] Ejecutar `bun run build`.
- [ ] Revisar `git diff --check` y confirmar que no se modificaron archivos de servidor.
- [ ] Probar visualmente el drawer, composición, perfiles, navegación y ambos formularios.
- [ ] Subir los commits aprobados a `main` para que Vercel despliegue.
