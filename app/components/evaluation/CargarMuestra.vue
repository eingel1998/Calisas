<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { pdf_a_png } from '~/utils/pdf-imagen'

type Campo = { key: string; label: string; unit: string }
// Sin `muestra`: registra una nueva. Con `muestra`: la edita y permite agregar los análisis que le falten.
const props = defineProps<{ apiBase: string; samples: any[]; chemicalFields: Campo[]; baseOptions: unknown[]; chemicalText: (t: string) => string; muestra?: any }>()
const emit = defineEmits(['saved', 'cancel'])
const toast = useToast()

const ANALISIS = [
  { id: 'frx', label: 'FRX', detalle: 'Tabla T (PDF) y espectro E', icon: 'i-heroicons-beaker' },
  { id: 'drx', label: 'DRX', detalle: 'Gráfica del difractograma', icon: 'i-heroicons-cube-transparent' },
  { id: 'petrografia', label: 'Petrografía', detalle: 'Fotos de secciones delgadas', icon: 'i-heroicons-photo' },
  { id: 'termicas', label: 'Propiedades térmicas', detalle: 'Lectura manual: D, C y K', icon: 'i-heroicons-fire' },
] as const
const EXTRAS = [['pn', 'Poder neutralizante (%)'], ['blancura', 'Blancura (%)'], ['tamano_particula', 'Tamaño de partícula (µm)'], ['humedad', 'Humedad (%)'], ['cao_disponible', 'CaO disponible (%)'], ['cao_reactivo', 'CaO reactivo (%)'], ['resistencia', 'Resistencia (MPa)'], ['absorcion', 'Absorción (%)']]
const QUIMICOS = computed(() => props.chemicalFields.filter(f => f.key !== 'loi'))

const nuevoContexto = () => ({ base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null as number | null | '' })
const estadoInicial = () => ({
  muestra: { id: '', coordenadas: '', direccion: '' },
  analisis: ['frx'] as string[],
  valores: {} as Record<string, number | null>,
  extras: {} as Record<string, number | null>,
  contexto: nuevoContexto(),
  extraccion: null as null | { originales: any[]; metadatos: Record<string, string>; texto_reporte: string; avisos: string[] },
})
const f = ref(estadoInicial())
const tabla = ref<File | null>(null)
const espectro = ref<File | null>(null)
const extrayendo = ref(false)
const guardando = ref(false)
const version = ref(0)
const drxRef = ref<any>(null)
const petroRef = ref<any>(null)
const termicasRef = ref<any>(null)

const editando = computed(() => Boolean(props.muestra))
// Registros históricos no guardan las entradas originales: su FRX no se puede recalcular.
const frxEditable = computed(() => !editando.value || props.muestra.version_evaluacion === 2)
const existentes = ref<string[]>([])
const archivosFrx = ref<any[]>([])
const cargandoExistente = ref(false)
const NOMBRE_ARCHIVO: Record<string, string> = { frx_tabla_pdf: 'Tabla T (PDF)', frx_espectro_pdf: 'Espectro E (PDF)' }

onMounted(async () => {
  if (!props.muestra) return
  const m = props.muestra
  const c = m.contexto || {}
  f.value.muestra = { id: m.id_muestra, coordenadas: m.coordenadas_muestreo || '', direccion: m.direccion_muestreo || '' }
  f.value.valores = Object.fromEntries(QUIMICOS.value.map(q => [q.key, c.entrada?.[q.key] ?? m[q.key] ?? null]))
  f.value.extras = Object.fromEntries(EXTRAS.map(([k]) => [k, m[k] ?? c.usados?.[k] ?? null]))
  f.value.contexto = { base: c.base || 'desconocida', base_trazas: c.base_trazas || 'desconocida', convertir: Boolean(c.convertir), estimar_loi: Boolean(c.estimar_loi), loi: c.procedencia?.loi === 'estimado' ? null : c.loi ?? null }
  f.value.extraccion = { originales: c.originales || [], metadatos: c.metadatos || {}, texto_reporte: c.texto_reporte || '', avisos: [] }
  cargandoExistente.value = true
  try {
    const base = `${props.apiBase}/historial/${encodeURIComponent(m.id_muestra)}`
    const [drx, petro, termicas, archivos, graficas]: any[] = await Promise.all([$fetch(`${base}/drx`), $fetch(`${base}/petrografia`), $fetch(`${base}/termicas`), $fetch(`${base}/archivos`), $fetch(`${base}/drx/graficas`)])
    archivosFrx.value = archivos.filter((a: any) => a.tipo.startsWith('frx_') && a.tipo.endsWith('_pdf'))
    const tieneFrx = QUIMICOS.value.some(q => m[q.key] != null)
    existentes.value = [
      tieneFrx && 'frx',
      (drx.fases?.length || graficas.length) && 'drx',
      (petro.informe || petro.imagenes?.length) && 'petrografia',
      termicas && 'termicas',
    ].filter(Boolean) as string[]
    f.value.analisis = [...existentes.value]
  } catch (e: any) {
    toast.add({ title: 'No se pudieron cargar los análisis de la muestra', description: e.data?.statusMessage, color: 'error' })
  } finally { cargandoExistente.value = false }
})

const activo = (a: string) => f.value.analisis.includes(a)
function alternar(a: string) {
  // desmarcar no borra: un análisis ya guardado se mantiene visible en edición
  if (existentes.value.includes(a)) return
  f.value.analisis = activo(a) ? f.value.analisis.filter(x => x !== a) : ANALISIS.map(x => x.id).filter(x => x === a || activo(x))
}
const idDuplicado = computed(() => !editando.value && props.samples.some(s => s.id_muestra === f.value.muestra.id.trim()))
// Cada análisis marcado necesita su fuente: FRX la tabla, DRX la gráfica, petrografía las fotos, térmicas la lectura.
const hayFrx = computed(() => Boolean(tabla.value) || QUIMICOS.value.some(c => f.value.valores[c.key] != null && f.value.valores[c.key] !== ''))
const faltantes = computed(() => [
  activo('frx') && !hayFrx.value && 'FRX: sube la tabla T',
  activo('drx') && !drxRef.value?.tieneGrafica() && 'DRX: sube la gráfica',
  activo('petrografia') && !petroRef.value?.tieneFotos() && 'Petrografía: sube las fotos',
  activo('termicas') && !termicasRef.value?.tieneDatos() && 'Térmicas: escribe D, C o K',
].filter(Boolean) as string[])
const puedeGuardar = computed(() => Boolean(f.value.muestra.id.trim()) && !idDuplicado.value && !faltantes.value.length && !guardando.value && !extrayendo.value && !cargandoExistente.value)

// Al elegir la tabla T se extraen los datos de inmediato; el usuario los revisa y corrige abajo.
// El laboratorio nombra los PDF con sufijo: «M7 T.pdf» (tabla) y «M7 E.pdf» (espectro). Se pueden soltar juntos.
const esEspectro = (f: File) => /(^|[\s_-])E\.pdf$/i.test(f.name)
async function elegirTabla(event: Event) {
  const input = event.target as HTMLInputElement
  const elegidos = Array.from(input.files || [])
  input.value = ''
  if (!elegidos.length) return
  if (elegidos.some(x => !x.name.toLowerCase().endsWith('.pdf'))) return toast.add({ title: 'Sube los PDF del laboratorio (T y, opcional, E)', color: 'error' })
  const e = elegidos.find(esEspectro)
  if (e) espectro.value = e
  const file = elegidos.find(x => !esEspectro(x))
  if (!file) return
  extrayendo.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const data: any = await $fetch(`${props.apiBase}/procesar-pdf`, { method: 'POST', body })
    tabla.value = file
    for (const c of QUIMICOS.value) f.value.valores[c.key] = data.datos[c.key] ?? null
    if (!editando.value && !f.value.muestra.id.trim() && data.datos.muestra_id) f.value.muestra.id = data.datos.muestra_id
    if (data.es_base_calcinada) f.value.contexto = { base: 'calcinada', base_trazas: 'calcinada', convertir: true, estimar_loi: true, loi: null }
    f.value.extraccion = { originales: data.datos.originales || [], metadatos: data.datos.metadatos || {}, texto_reporte: data.datos.texto_reporte || data.texto_crudo || '', avisos: data.avisos || [] }
    toast.add({ title: 'Datos extraídos', description: 'Revisa los valores antes de guardar.', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudo leer el PDF', description: e.data?.statusMessage || 'Sube el informe «Sample results» (archivo T).', color: 'error' })
  } finally { extrayendo.value = false }
}
function elegirEspectro(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file && !file.name.toLowerCase().endsWith('.pdf')) return toast.add({ title: 'El espectro debe ser un PDF', color: 'error' })
  espectro.value = file || null
}
function quitarTabla() {
  tabla.value = null
  f.value.extraccion = null
}

const nulo = (v: unknown) => v == null || v === '' ? null : v
function contextoEvaluacion() {
  const c = f.value.contexto
  const loi = nulo(c.loi)
  return {
    ...c, loi, originales: f.value.extraccion?.originales || [], texto_reporte: f.value.extraccion?.texto_reporte || '',
    convertir: c.base === 'calcinada' && c.convertir,
    estimar_loi: c.base === 'calcinada' && c.convertir && c.estimar_loi && loi == null,
  }
}

async function guardar() {
  if (!puedeGuardar.value) return
  guardando.value = true
  const id = f.value.muestra.id.trim()
  try {
    const frx = activo('frx')
    const valoresFrx = Object.fromEntries(QUIMICOS.value.map(c => [c.key, frx ? nulo(f.value.valores[c.key]) : null]))
    const extras = Object.fromEntries(EXTRAS.map(([k]) => [k, frx ? nulo(f.value.extras[k]) : null]))
    let saved: any
    if (!editando.value) {
      saved = await $fetch(`${props.apiBase}/evaluar`, {
        method: 'POST',
        body: {
          id_muestra: id, coordenadas_muestreo: f.value.muestra.coordenadas, direccion_muestreo: f.value.muestra.direccion,
          ...valoresFrx, drx: null, petrografia: null, extras,
          archivo_fuente: frx && tabla.value ? tabla.value.name : frx ? 'Formulario manual' : 'Sin FRX',
          contexto: frx ? contextoEvaluacion() : nuevoContexto(),
          guardar_db: true,
        },
      })
    } else {
      saved = props.muestra
      // recalcula dictámenes con los valores actuales; el servidor rechaza si otro usuario la modificó entretanto
      if (frxEditable.value) await $fetch(`${props.apiBase}/historial/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: {
          fecha_modificacion: props.muestra.fecha_modificacion || null,
          datos: { ...valoresFrx, id_muestra: id, extras, drx: props.muestra.drx || '', petrografia: props.muestra.petrografia || '',
            coordenadas_muestreo: f.value.muestra.coordenadas, direccion_muestreo: f.value.muestra.direccion,
            contexto: { ...contextoEvaluacion(), originales: f.value.extraccion?.originales || [], texto_reporte: f.value.extraccion?.texto_reporte || '' } },
        },
      })
    }
    // Lo demás se guarda por partes: si algo falla, la muestra base ya quedó registrada.
    const fallos: string[] = []
    if (frx && (tabla.value || espectro.value)) {
      try {
        const body = new FormData()
        if (tabla.value) { body.append('frx_tabla_pdf', tabla.value); body.append('frx_tabla_png', await pdf_a_png(tabla.value)) }
        if (espectro.value) { body.append('frx_espectro_pdf', espectro.value); body.append('frx_espectro_png', await pdf_a_png(espectro.value, 270)) }
        await $fetch(`${props.apiBase}/historial/${encodeURIComponent(id)}/archivos`, { method: 'POST', body })
      } catch { fallos.push('archivos FRX') }
    }
    for (const [a, r] of [['drx', drxRef], ['petrografia', petroRef], ['termicas', termicasRef]] as const) {
      if (activo(a) && r.value) try { await r.value.save(id) } catch { fallos.push(a) }
    }
    toast.add(fallos.length
      ? { title: `Muestra ${id} ${editando.value ? 'actualizada' : 'guardada'} con avisos`, description: `No se guardó: ${fallos.join(', ')}. Complétalo desde el historial.`, color: 'warning' }
      : { title: `Muestra ${id} ${editando.value ? 'actualizada' : 'guardada'}`, color: 'success' })
    emit('saved', saved)
    if (!editando.value) {
      f.value = estadoInicial()
      tabla.value = espectro.value = null
      version.value++
    }
  } catch (e: any) {
    toast.add({ title: 'No se pudo guardar la muestra', description: e.data?.statusMessage || e.data?.detail || e.statusMessage, color: 'error' })
  } finally { guardando.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-4 pb-44 md:space-y-6 md:pb-28">
    <!-- 1. Muestra -->
    <section class="rounded-xl border bg-white p-4 md:p-5">
      <h3 class="flex items-center gap-2 font-bold"><span class="grid size-6 place-items-center rounded-full bg-emerald-600 text-xs text-white">1</span>Muestra</h3>
      <p class="mb-4 mt-1 text-sm text-slate-500">{{ editando ? 'El ID no se puede cambiar. La ubicación se usa en el análisis de mercado.' : 'Registro base. Todos los análisis se asocian a este ID; la ubicación se usa en el análisis de mercado.' }}</p>
      <div class="grid gap-3 md:grid-cols-3">
        <div><AppField v-model="f.muestra.id" label="ID de la muestra *" placeholder="Ej: M7 (se toma del PDF si lo subes)" :disabled="editando" /><p v-if="idDuplicado" class="mt-1 text-xs text-rose-600">Ya existe una muestra con este ID.</p></div>
        <AppField v-model="f.muestra.coordenadas" label="Coordenadas" placeholder="Lat, long (WGS84) o UTM" />
        <AppField v-model="f.muestra.direccion" label="Dirección / municipio" placeholder="Sitio, municipio, departamento" />
      </div>
    </section>

    <!-- 2. Análisis -->
    <section class="rounded-xl border bg-white p-4 md:p-5">
      <h3 class="flex items-center gap-2 font-bold"><span class="grid size-6 place-items-center rounded-full bg-emerald-600 text-xs text-white">2</span>¿Qué análisis tiene?</h3>
      <p class="mb-4 mt-1 text-sm text-slate-500">{{ editando ? 'Los análisis guardados aparecen marcados; marca los que falten para agregarlos.' : 'Cada análisis es independiente; marca los que tengas. Se complementan en el informe integral.' }}</p>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button v-for="a in ANALISIS" :key="a.id" type="button" :aria-pressed="activo(a.id)" class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors" :class="[activo(a.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300', existentes.includes(a.id) && 'cursor-default']" @click="alternar(a.id)">
          <UIcon :name="activo(a.id) ? 'i-heroicons-check-circle-solid' : a.icon" class="mt-0.5 size-5 shrink-0" :class="activo(a.id) ? 'text-emerald-600' : 'text-slate-400'" />
          <span><span class="block text-sm font-semibold">{{ a.label }}<UBadge v-if="existentes.includes(a.id)" size="sm" variant="subtle" color="success" class="ml-2">Guardado</UBadge></span><span class="block text-xs text-slate-500">{{ a.detalle }}</span></span>
        </button>
      </div>
    </section>

    <!-- 3. Un bloque por análisis, en orden fijo -->
    <div :key="version" class="space-y-6">
      <section v-if="activo('frx')" class="rounded-xl border bg-white p-4 md:p-5">
        <h3 class="flex items-center gap-2 font-bold"><UIcon name="i-heroicons-beaker" class="size-5 text-emerald-600" />FRX · geoquímica</h3>
        <p class="mb-4 mt-1 text-sm text-slate-500">Sube la tabla «Sample results» del laboratorio: los valores se extraen solos y puedes corregirlos.{{ editando ? ' Al guardar se recalculan los dictámenes.' : '' }}</p>
        <p v-if="!frxEditable" class="mb-4 rounded border-l-4 border-amber-500 bg-amber-50 p-2 text-sm text-amber-800">Registro histórico: su FRX se conserva sin recalcular y no se puede editar. Sí puedes agregar o editar los demás análisis.</p>
        <p v-if="archivosFrx.length" class="mb-3 text-sm">Guardados: <a v-for="a in archivosFrx" :key="a.id" :href="`${apiBase}/historial/${encodeURIComponent(f.muestra.id)}/archivos/${a.id}`" target="_blank" rel="noopener" class="mr-3 text-emerald-700 underline">{{ NOMBRE_ARCHIVO[a.tipo] || a.nombre }}</a><span class="text-xs text-slate-500">· subir otro los reemplaza</span></p>
        <fieldset :disabled="!frxEditable" class="contents">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-emerald-500" :class="tabla ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'">
            <input type="file" multiple accept=".pdf,application/pdf" class="sr-only" :disabled="extrayendo" @change="elegirTabla">
            <UIcon :name="extrayendo ? 'i-lucide-loader-2' : tabla ? 'i-heroicons-document-check' : 'i-heroicons-document-arrow-up'" class="size-7 shrink-0" :class="[extrayendo && 'animate-spin', tabla ? 'text-emerald-600' : 'text-slate-400']" />
            <span class="min-w-0"><span class="block text-sm font-semibold">Tabla «Sample results» (T)</span><span class="block truncate text-xs text-slate-500">{{ extrayendo ? 'Extrayendo datos…' : tabla ? tabla.name : 'PDF «… T.pdf» · puedes soltar T y E juntos' }}</span></span>
            <button v-if="tabla && !extrayendo" type="button" class="ml-auto text-xs text-rose-600" @click.prevent="quitarTabla">Quitar</button>
          </label>
          <label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-emerald-500" :class="espectro ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'">
            <input type="file" accept=".pdf,application/pdf" class="sr-only" @change="elegirEspectro">
            <UIcon :name="espectro ? 'i-heroicons-document-check' : 'i-heroicons-chart-bar'" class="size-7 shrink-0" :class="espectro ? 'text-emerald-600' : 'text-slate-400'" />
            <span class="min-w-0"><span class="block text-sm font-semibold">Espectro (E) · opcional</span><span class="block truncate text-xs text-slate-500">{{ espectro ? espectro.name : 'PDF · se envía como imagen al modelo' }}</span></span>
            <button v-if="espectro" type="button" class="ml-auto text-xs text-rose-600" @click.prevent="espectro = null">Quitar</button>
          </label>
        </div>
        <div v-if="f.extraccion?.avisos.length" class="mt-4 space-y-2"><p v-for="aviso in f.extraccion.avisos" :key="aviso" class="rounded border-l-4 border-amber-500 bg-amber-50 p-2 text-sm text-amber-800">{{ chemicalText(aviso) }}</p></div>
        <template v-if="hayFrx">
        <p class="mb-2 mt-5 text-sm font-semibold">Valores extraídos <span class="font-normal text-slate-500">· revísalos; vacío = no medido</span></p>
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AppField v-for="c in QUIMICOS" :key="c.key" v-model.number="f.valores[c.key]" :label="`${c.label} (${c.unit})`" type="number" step="any" min="0" :max="c.unit === '%' ? 100 : undefined" placeholder="-" />
        </div>
        <div class="mt-4 space-y-2">
          <details class="rounded-lg border p-3 text-sm"><summary class="cursor-pointer font-semibold">Base analítica y LOI {{ f.contexto.base === 'calcinada' ? '· calcinada' : '' }}</summary><div class="mt-3"><EvaluationContextPanel v-model:options="f.contexto" :base-options="baseOptions" :is-batch="false" /></div></details>
          <details class="rounded-lg border p-3 text-sm"><summary class="cursor-pointer font-semibold">Ensayos adicionales (habilitan más usos industriales)</summary><div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"><AppField v-for="[k, label] in EXTRAS" :key="k" v-model.number="f.extras[k]" :label="label" type="number" step="any" min="0" placeholder="-" /></div></details>
          <details v-if="f.extraccion?.originales.length" class="rounded-lg border p-3 text-sm"><summary class="cursor-pointer font-semibold">Reporte original completo ({{ f.extraccion.originales.length }} compuestos)</summary><div class="mt-3"><OriginalCompositionTable :originales="f.extraccion.originales" :chemical-text="chemicalText" /></div></details>
        </div>
        </template>
        </fieldset>
      </section>

      <section v-if="activo('drx')" class="rounded-xl border bg-white p-4 md:p-5">
        <h3 class="mb-4 flex items-center gap-2 font-bold"><UIcon name="i-heroicons-cube-transparent" class="size-5 text-emerald-600" />DRX · mineralogía</h3>
        <DrxView ref="drxRef" :api-base="apiBase" :sample-id="editando ? f.muestra.id : undefined" :nuevo="!editando" />
      </section>

      <section v-if="activo('petrografia')" class="rounded-xl border bg-white p-4 md:p-5">
        <h3 class="mb-4 flex items-center gap-2 font-bold"><UIcon name="i-heroicons-photo" class="size-5 text-emerald-600" />Petrografía · secciones delgadas</h3>
        <PetrografiaView ref="petroRef" :api-base="apiBase" :sample-id="f.muestra.id.trim()" :nuevo="!editando" />
      </section>

      <section v-if="activo('termicas')" class="rounded-xl border bg-white p-4 md:p-5">
        <h3 class="mb-4 flex items-center gap-2 font-bold"><UIcon name="i-heroicons-fire" class="size-5 text-emerald-600" />Propiedades térmicas</h3>
        <TermicasView ref="termicasRef" :api-base="apiBase" :sample-id="editando ? f.muestra.id : undefined" :nuevo="!editando" />
      </section>
    </div>

    <!-- Guardado único -->
    <div class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-white md:bottom-0 md:left-20 lg:left-72">
      <div class="mx-auto flex max-w-5xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
        <p class="line-clamp-2 min-w-0 text-xs text-slate-600 sm:text-sm">
          <span v-if="f.muestra.id.trim() && faltantes.length" class="text-amber-700"><UIcon name="i-heroicons-exclamation-triangle" class="mr-1 inline size-4 align-text-bottom" />{{ faltantes.join(' · ') }}</span>
          <template v-else-if="f.muestra.id.trim()"><b>{{ f.muestra.id.trim() }}</b> · {{ f.analisis.length ? ANALISIS.filter(a => activo(a.id)).map(a => a.label).join(' · ') : 'sin análisis (solo registro base)' }}</template>
          <template v-else>Escribe el ID de la muestra (o sube el PDF del FRX) para guardar.</template>
        </p>
        <div class="flex shrink-0 gap-2"><UButton v-if="editando" variant="ghost" color="neutral" size="lg" :disabled="guardando" @click="emit('cancel')">Cancelar</UButton><UButton color="success" size="lg" class="flex-1 justify-center sm:flex-none" icon="i-heroicons-check" :loading="guardando" :disabled="!puedeGuardar" @click="guardar">{{ editando ? 'Guardar cambios' : 'Guardar muestra' }}</UButton></div>
      </div>
    </div>
  </div>
</template>
