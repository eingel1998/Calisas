<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  sample?: any
  apiBase: string
  chemicalFields: Array<{ key: string; label: string; unit: string }>
  chemicalText: (text: string) => string
  file?: File | null
  confirmed: boolean
  replace: boolean
  loading: boolean
}>()
const emit = defineEmits(['select-evidence', 'update:confirmed', 'update:replace', 'upload-evidence'])

const PESTANAS = [{ id: 'resumen', label: 'Resumen' }, { id: 'informes', label: 'Informes IA' }, { id: 'laboratorio', label: 'Datos de laboratorio' }]
const pestana = ref('resumen')
const drx = ref<any>(null)
const petro = ref<any>(null)
const termico = ref<any>(null)
const archivos = ref<any[]>([])
const graficasDrx = ref<any[]>([])
const TERMICAS: Array<[string, string, string]> = [['difusividad', 'Difusividad D', 'mm²/s'], ['capacidad_volumetrica', 'Capacidad calorífica C', 'MJ/m³·K'], ['conductividad', 'Conductividad K', 'W/m·K'], ['syx', 'Error del ajuste Sᵧₓ', ''], ['temperatura_muestra', 'Temperatura', '°C'], ['duracion_min', 'Duración', 'min']]
const KPIS: Array<[string, string, string]> = [['caco3', 'CaCO₃', '%'], ['cao', 'CaO', '%'], ['mgo', 'MgO', '%'], ['sio2', 'SiO₂', '%'], ['fe2o3', 'Fe₂O₃', '%'], ['lsf', 'LSF', '']]

const base = () => `${props.apiBase}/historial/${encodeURIComponent(props.sample?.id_muestra || '')}`
const aptos = computed(() => usosAptos(props.sample?.dictamenes))
const archivo = (tipo: string) => archivos.value.find(a => a.tipo === tipo)
const url = (a: any) => `${base()}/archivos/${a.id}`
const tieneFrx = computed(() => ['caco3', 'cao', 'mgo', 'sio2'].some(k => props.sample?.[k] != null))
const tieneFotos = computed(() => Boolean(petro.value?.imagenes?.length))

watch(() => props.sample?.id_muestra, async id => {
  pestana.value = 'resumen'
  drx.value = petro.value = termico.value = null
  archivos.value = []
  graficasDrx.value = []
  if (!id) return
  const [d, p, t, a, g] = await Promise.allSettled([$fetch(`${base()}/drx`), $fetch(`${base()}/petrografia`), $fetch(`${base()}/termicas`), $fetch(`${base()}/archivos`), $fetch(`${base()}/drx/graficas`)])
  if (id !== props.sample?.id_muestra) return
  drx.value = d.status === 'fulfilled' ? d.value : null
  petro.value = p.status === 'fulfilled' ? p.value : null
  termico.value = t.status === 'fulfilled' ? t.value : null
  archivos.value = a.status === 'fulfilled' ? a.value as any[] : []
  graficasDrx.value = g.status === 'fulfilled' ? g.value as any[] : []
}, { immediate: true })
</script>

<template>
  <div class="space-y-5">
    <nav class="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:mx-0" role="tablist" aria-label="Secciones del detalle">
      <button v-for="p in PESTANAS" :key="p.id" type="button" role="tab" :aria-selected="pestana === p.id" class="min-h-11 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600 sm:min-h-0 sm:flex-1" :class="pestana === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'" @click="pestana = p.id">{{ p.label }}</button>
    </nav>

    <!-- Resumen: lo que decide el destino de la muestra -->
    <div v-show="pestana === 'resumen'" class="space-y-6">
      <p v-if="sample?.version_evaluacion !== 2" class="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-800">Registro histórico: evaluado con una versión anterior; se conserva sin recalcular.</p>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        <div v-for="[k, label, u] in KPIS" :key="k" class="rounded-lg border bg-white p-3"><p class="text-xs text-slate-500">{{ label }}</p><p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">{{ num(sample?.[k]) }}<span v-if="u && sample?.[k] != null" class="ml-0.5 text-xs font-normal text-slate-500">{{ u }}</span></p></div>
      </div>
      <div v-if="sample?.resumen" class="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        <div class="rounded-lg bg-emerald-50 p-3"><p class="text-2xl font-bold text-emerald-700">{{ sample.resumen.aptos }}</p><p class="text-xs text-emerald-800">usos aptos</p></div>
        <div class="rounded-lg bg-rose-50 p-3"><p class="text-2xl font-bold text-rose-700">{{ sample.resumen.no_aptos }}</p><p class="text-xs text-rose-800">no aptos</p></div>
        <div class="rounded-lg bg-amber-50 p-3"><p class="text-2xl font-bold text-amber-700">{{ sample.resumen.pendientes }}</p><p class="text-xs text-amber-800">requieren ensayos</p></div>
        <div class="col-span-3 rounded-lg border p-3 sm:col-span-1"><p class="text-xs text-slate-500">Mejor destino técnico</p><p class="mt-1 font-semibold text-slate-900">{{ aptos[0] || 'Ninguno por ahora' }}</p></div>
      </div>
      <div>
        <h3 class="mb-1 font-semibold">Usos industriales por nivel de valor</h3>
        <p class="mb-3 text-xs text-slate-500">Cumplimiento de los criterios configurados; no constituye certificación normativa. Abre un uso para ver sus criterios.</p>
        <IndustrialProfiles :dictamenes="sample?.dictamenes" :chemical-text="chemicalText" />
      </div>
    </div>

    <!-- Informes IA: cada uno exige la fuente de su análisis -->
    <div v-show="pestana === 'informes'" class="space-y-4">
      <InformeIA v-if="tieneFrx" :sample-id="sample?.id_muestra" :api-base="apiBase" titulo="Informe integral · valorización comercial" descripcion="Traduce toda la evidencia en un propósito comercial: mercados por nivel de valor, brechas y ensayos que abren mercados. Usa como insumo los informes por análisis revisados." />
      <p v-else class="rounded-xl border p-4 text-sm text-slate-500">El informe integral necesita el FRX de la muestra. Agrégalo con «Editar muestra».</p>
      <div class="divide-y rounded-xl border">
        <div v-for="a in [
          { alcance: 'frx', titulo: 'Geoquímica (FRX)', fuente: tieneFrx, falta: 'Sin FRX: sube la tabla T.' },
          { alcance: 'drx', titulo: 'Mineralogía (DRX)', fuente: sample?.tiene_drx, falta: 'Sin gráfica DRX.' },
          { alcance: 'petrografia', titulo: 'Petrografía', fuente: tieneFotos, falta: 'Sin fotos de secciones delgadas.' },
          { alcance: 'termicas', titulo: 'Propiedades térmicas', fuente: sample?.tiene_termicas, falta: 'Sin lectura térmica.' },
        ]" :key="a.alcance" class="p-4">
          <p class="mb-2 text-sm font-semibold">{{ a.titulo }}</p>
          <InformeIA v-if="a.fuente" compacto :sample-id="sample?.id_muestra" :api-base="apiBase" :alcance="a.alcance" :titulo="`Informe de ${a.titulo}`" />
          <p v-else class="text-sm text-slate-400">{{ a.falta }} Agrégalo con «Editar muestra».</p>
        </div>
      </div>
    </div>

    <!-- Datos de laboratorio -->
    <div v-show="pestana === 'laboratorio'" class="space-y-6">
      <section>
        <h3 class="mb-2 font-semibold">FRX · geoquímica</h3>
        <p class="mb-3 text-xs text-slate-500">Base declarada: {{ sample?.contexto?.base || 'no registrada' }} · trazas: {{ sample?.contexto?.base_trazas || 'no registrada' }}<template v-if="sample?.contexto?.convertir"> · convertido a base seca con LOI {{ num(sample.contexto.loi, '%') }}</template></p>
        <div class="overflow-x-auto rounded-lg border">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs text-slate-500"><tr><th class="px-3 py-2 font-medium">Parámetro</th><th class="px-3 py-2 text-right font-medium">Valor usado</th><th class="px-3 py-2 font-medium">Procedencia</th></tr></thead>
            <tbody class="divide-y"><tr v-for="c in chemicalFields" :key="c.key"><td class="px-3 py-1.5">{{ c.label }}</td><td class="px-3 py-1.5 text-right tabular-nums">{{ num(sample?.[c.key], c.unit) }}</td><td class="px-3 py-1.5 text-xs text-slate-500">{{ sample?.[c.key] == null ? 'no medido' : sample?.contexto?.procedencia?.[c.key] || 'medido' }}</td></tr></tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-slate-500">LSF {{ num(sample?.lsf) }} · SM {{ num(sample?.sm) }} · AM {{ num(sample?.am) }}. Relaciones calculadas; no determinan por sí solas la aptitud.</p>
        <div v-if="archivo('frx_tabla_png') || archivo('frx_espectro_png')" class="mt-3 grid gap-3 sm:grid-cols-2">
          <a v-for="t in ['frx_tabla_png', 'frx_espectro_png'].filter(archivo)" :key="t" :href="url(archivo(t))" target="_blank" rel="noopener" class="overflow-hidden rounded-lg border"><img :src="url(archivo(t))" :alt="t === 'frx_tabla_png' ? 'Tabla FRX' : 'Espectro FRX'" class="h-40 w-full bg-white object-contain" loading="lazy"><p class="border-t px-2 py-1 text-xs">{{ t === 'frx_tabla_png' ? 'Tabla «Sample results» (T)' : 'Espectro (E)' }}<a v-if="archivo(t.replace('_png', '_pdf'))" :href="url(archivo(t.replace('_png', '_pdf')))" target="_blank" rel="noopener" class="ml-2 text-emerald-700 hover:underline" @click.stop>PDF</a></p></a>
        </div>
        <details v-if="sample?.contexto?.originales?.length" class="mt-3 rounded-lg border p-3 text-sm"><summary class="cursor-pointer font-medium">Reporte original completo ({{ sample.contexto.originales.length }} compuestos)</summary><div class="mt-3"><OriginalCompositionTable :originales="sample.contexto.originales" :chemical-text="chemicalText" /></div></details>
        <details v-if="Object.keys(sample?.contexto?.metadatos || {}).length" class="mt-2 rounded-lg border p-3 text-sm"><summary class="cursor-pointer font-medium">Información del ensayo</summary><dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><template v-for="(v, k) in sample.contexto.metadatos" :key="k"><dt class="text-slate-500">{{ k }}</dt><dd>{{ v }}</dd></template></dl></details>
      </section>
      <section>
        <h3 class="mb-2 font-semibold">DRX · mineralogía</h3>
        <div v-if="graficasDrx.length" class="grid gap-3 sm:grid-cols-2">
          <div v-for="(gr, n) in graficasDrx" :key="gr.id" class="overflow-hidden rounded-lg border">
            <a :href="`${base()}/drx/graficas/${gr.id}`" target="_blank" rel="noopener"><img :src="`${base()}/drx/graficas/${gr.id}`" :alt="`Gráfica DRX ${n + 1}`" class="h-56 w-full bg-white object-contain" loading="lazy"></a>
            <p class="flex items-center justify-between gap-2 border-t px-2 py-1 text-xs"><span class="truncate">{{ gr.nombre }}</span><a v-if="gr.original_mime === 'application/pdf'" :href="`${base()}/drx/graficas/${gr.id}?original=1`" target="_blank" rel="noopener" class="shrink-0 text-emerald-700 hover:underline">PDF</a></p>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">Sin gráficas DRX.</p>
        <div v-if="drx?.fases?.length" class="mt-3"><p class="mb-1 text-xs text-slate-500">Fases transcritas (registro anterior)</p><div class="flex flex-wrap gap-2"><span v-for="f in drx.fases" :key="f.mineral" class="rounded-full border px-3 py-1 text-sm">{{ f.mineral }}<b v-if="f.porcentaje != null" class="ml-1 tabular-nums">{{ num(f.porcentaje, '%') }}</b></span></div></div>
      </section>
      <section>
        <h3 class="mb-2 font-semibold">Petrografía · secciones delgadas</h3>
        <div v-if="tieneFotos" class="grid grid-cols-2 gap-3 sm:grid-cols-4"><a v-for="img in petro.imagenes" :key="img.id" :href="`${base()}/petrografia/${img.id}`" target="_blank" rel="noopener" class="group overflow-hidden rounded-lg border"><img :src="`${base()}/petrografia/${img.id}`" :alt="img.nombre" class="aspect-square w-full object-cover transition-transform group-hover:scale-105" loading="lazy"><p class="truncate px-2 py-1 text-xs">{{ img.condicion }}</p></a></div>
        <p v-else class="text-sm text-slate-400">Sin fotos de secciones delgadas.</p>
        <dl v-if="petro?.datos && Object.values(petro.datos).some(Boolean)" class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm"><template v-for="(v, k) in petro.datos" :key="k"><template v-if="v"><dt class="capitalize text-slate-500">{{ String(k).replace('_', ' ') }}</dt><dd>{{ v }}</dd></template></template></dl>
      </section>
      <section>
        <h3 class="mb-2 font-semibold">Propiedades térmicas · lectura manual</h3>
        <div v-if="termico" class="grid grid-cols-2 gap-3 sm:grid-cols-3"><div v-for="[k, label, u] in TERMICAS" :key="k" class="rounded-lg border p-3"><p class="text-xs text-slate-500">{{ label }}</p><p class="font-semibold tabular-nums">{{ num(termico[k], u) }}</p></div></div>
        <p v-if="termico" class="mt-2 text-xs text-slate-500">{{ [termico.tecnica, termico.sensor, termico.nivel_lectura && `lectura ${termico.nivel_lectura}`, termico.fecha_ensayo].filter(Boolean).join(' · ') }}</p>
        <p v-else class="text-sm text-slate-400">Sin lectura térmica.</p>
      </section>
      <section class="border-t pt-5">
        <EvidenceSection :sample="sample" :file="file" :confirmed="confirmed" :replace="replace" :loading="loading" :api-base="apiBase" @select="emit('select-evidence', $event)" @update:confirmed="emit('update:confirmed', $event)" @update:replace="emit('update:replace', $event)" @upload="emit('upload-evidence')" />
      </section>
    </div>
  </div>
</template>
