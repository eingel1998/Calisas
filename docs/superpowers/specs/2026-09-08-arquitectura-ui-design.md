# Arquitectura reutilizable de la interfaz

Fecha: 2026-09-08. Diseño aprobado en conversación; pendiente de revisión del documento antes de planificar e implementar.

## Objetivo

Reducir `app/app.vue` a composición de aplicación, sesión, navegación y coordinación de API. Las vistas contendrán componentes de dominio y estos reutilizarán una capa pequeña de elementos visuales comunes. La evaluación química, sus reglas, rutas API y datos guardados no cambian.

## Capas

### Elementos base

- `AppField`: etiqueta, `v-model` y atributos del campo. Aplica por defecto el mismo estilo de etiqueta, separación, ancho y entrada numérica o de texto.
- `AppSelect`: equivalente para opciones, con el mismo tratamiento visual que `AppField`.
- `AppSection`: título, descripción opcional y contenedor coherente para bloques de una vista o drawer.
- `AppTable`: contenedor con cabecera, filas separadas y desplazamiento horizontal. La tabla concreta conserva sus propias columnas mediante slots.

Los elementos base no calculan, consultan API ni conocen campos químicos. Los casos que requieran una composición distinta usarán slots; no se crearán envoltorios que solo reenvíen un componente de Nuxt UI sin aportar estilo o comportamiento común.

### Estructura

- `SidebarNav` se reutiliza como única navegación lateral y recibe el estado activo y el evento de navegación.
- `PageHeader` concentra encabezados de vistas cuando el patrón se repita.
- `SampleDetailDrawer` controla la presentación del detalle, recibe una muestra y emite las acciones de evidencia. No carga ni guarda datos por sí mismo.

### Dominio

- `ChemicalForm` muestra los campos químicos, DRX, petrografía y ensayos adicionales usando los elementos base. La vista dueña conserva el objeto reactivo y maneja guardar.
- `OriginalCompositionTable` recibe la lista original y la presenta mediante `AppTable` con compuesto, lectura y unidad.
- `IndustrialProfiles` recibe dictámenes y muestra aplicación, criterio, procedencia, resultado, pendientes y observaciones.
- `EvidenceSection` recibe el estado de evidencia y emite selección, confirmación, reemplazo y carga.

### Vistas

`DashboardView`, `EvaluarView` e `HistorialView` contienen solo sus combinaciones de componentes de dominio. Las acciones asíncronas, sesión, toasts, selección de muestra y estado de navegación quedan temporalmente en `app.vue`; se extraerán solo si se repiten entre vistas.

## Orden visual del detalle

Dentro de `SampleDetailDrawer` el orden será:

1. Resumen de evaluación.
2. Perfiles de uso industrial.
3. Datos del análisis y procedencia.
4. Composición original completa.
5. Información del ensayo y texto extraído.
6. Evidencia PDF.

`OriginalCompositionTable` mostrará una tabla visible, con cabecera diferenciada, filas separadas, área desplazable y estado vacío. La cantidad de componentes se conservará en el título.

## Migración

1. Crear los cuatro elementos base y aplicar `AppField` y `AppSelect` en los formularios químico manual y PDF.
2. Reemplazar la navegación duplicada por `SidebarNav` y mover el drawer a `SampleDetailDrawer` junto con sus componentes de dominio.
3. Mover el contenido de cada pestaña a las vistas existentes, eliminando versiones duplicadas o sin uso solo después de que su reemplazo esté integrado.
4. Dejar `app.vue` como orquestador y retirar marcado repetido.

Cada etapa conserva las mismas props, eventos y payloads de las rutas actuales. No se combinan con la integración de IA, cambios de persistencia ni cambios de cálculo.

## Errores y accesibilidad

Los campos base deben permitir `required`, límites, placeholders, estado deshabilitado y texto de ayuda. Los errores actuales de API siguen mostrándose con toasts. Tablas y drawer conservan encabezados semánticos, etiquetas accesibles e interacción por teclado proporcionada por Nuxt UI.

## Verificación

- El build de Nuxt completa con Bun.
- Formularios manual y PDF envían el mismo payload antes y después de la migración.
- El drawer conserva detalle, evidencia y acciones de la muestra seleccionada.
- Los perfiles aparecen antes que los datos del análisis.
- La composición de 22 componentes es legible en escritorio y móvil, sin cortar columnas.
- Navegación lateral cambia a la misma vista y subpestaña actuales.

## Fuera de alcance

No se crean bibliotecas nuevas, un sistema de temas, una capa de formularios genérica para reglas químicas, cambios de backend, cambios de análisis ni IA en esta migración.
