<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="text-3xl">🪨</span>
        <div>
          <h3 class="font-bold text-lg text-default">Muestra: {{ sample.id_muestra }}</h3>
          <p class="text-xs text-dimmed">Registrado el: {{ sample.fecha_registro }}</p>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Main Veredicto banner -->
      <div :class="['p-4 rounded-xl border flex items-center gap-3', sample.estado_eval === 'APTO' ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error']">
        <UIcon :name="sample.estado_eval === 'APTO' ? 'i-heroicons-trophy' : 'i-heroicons-x-circle'" class="w-8 h-8 shrink-0" />
        <div>
          <p class="font-bold text-sm">
            {{ sample.id_muestra }} — {{ sample.estado_eval === 'APTO' ? 'APTO para Cemento Portland' : 'NO APTO para Cemento Portland' }}
          </p>
          <p class="text-xs mt-0.5 opacity-90">Evaluado bajo normas internacionales ASTM C150 / NTC 321</p>
        </div>
      </div>

      <!-- Tabs of calculations -->
      <UTabs :items="[
        { label: '📊 Química y Módulos', slot: 'quimica' },
        { label: '🔥 Clinker (Bogue)', slot: 'clinker' },
        { label: '🏭 17 Perfiles de Uso', slot: 'perfiles' },
        { label: '🧠 Interpretación IA', slot: 'ia' }
      ]">
        <!-- Química y Módulos Tab -->
        <template #quimica>
          <div class="py-4 space-y-6">
            <!-- Grid of metrics -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">CaCO3 (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.caco3 }}%</p>
              </div>
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">CaO (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.cao }}%</p>
              </div>
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">MgO (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.mgo }}%</p>
              </div>
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">SiO2 (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.sio2 }}%</p>
              </div>
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">LOI (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.loi?.toFixed(2) }}%</p>
              </div>
              <div class="bg-muted p-3 rounded-lg border border-muted">
                <p class="text-xs font-semibold text-dimmed">Res. Insoluble (%)</p>
                <p class="text-xl font-extrabold text-default mt-1">{{ sample.res_insol?.toFixed(2) }}%</p>
              </div>
            </div>

            <div class="border-t border-muted pt-4 space-y-3">
              <h4 class="font-bold text-default">Módulos del Horno</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="border border-muted rounded-lg p-3">
                  <p class="text-xs text-dimmed">Factor de Saturación de Cal (LSF)</p>
                  <p class="text-2xl font-black text-default mt-0.5">{{ sample.lsf?.toFixed(3) }}</p>
                </div>
                <div class="border border-muted rounded-lg p-3">
                  <p class="text-xs text-dimmed">Módulo de Sílice (SM)</p>
                  <p class="text-2xl font-black text-default mt-0.5">{{ sample.sm?.toFixed(3) }}</p>
                </div>
              </div>
            </div>

            <!-- Base de cálculo del dictamen -->
            <div v-if="sample.base_calcinada" class="p-3 bg-info/10 border border-info/20 rounded-lg text-xs text-default space-y-1">
              <p>
                <b>Base de cálculo:</b> el reporte XRF viene normalizado a 100% sin LOI (base calcinada), así que los valores mostrados arriba son los del reporte.
                Los criterios normativos se contrastan sobre <b>base carbonato</b> (factor {{ sample.factor_base }}, LOI {{ sample.loi?.toFixed(2) }}%).
              </p>
              <p v-if="sample.base_evaluacion" class="text-muted">
                Evaluado con: CaCO3 {{ sample.base_evaluacion.caco3 }}% · CaO {{ sample.base_evaluacion.cao }}% · MgO {{ sample.base_evaluacion.mgo }}% · SiO2 {{ sample.base_evaluacion.sio2 }}% · Fe2O3 {{ sample.base_evaluacion.fe2o3 }}%
              </p>
            </div>

            <!-- Reporte XRF completo -->
            <div v-if="elementos.length" class="border-t border-muted pt-4 space-y-3">
              <h4 class="font-bold text-default">Reporte XRF completo ({{ elementos.length }} compuestos)</h4>
              <p class="text-xs text-muted">Valores tal como los emitió el equipo. Los perfiles industriales solo evalúan los que tienen criterio normativo; el resto queda registrado para trazabilidad.</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="e in elementos"
                  :key="e.nombre"
                  class="text-xs px-2 py-1 rounded border"
                  :class="EVALUADOS.includes(e.nombre) ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : 'bg-muted border-muted text-muted'"
                >
                  {{ e.nombre }} {{ e.conc }} {{ e.unidad }}
                </span>
              </div>
              <p class="text-xs text-dimmed">Resaltados = usados en el dictamen.</p>
            </div>

            <!-- Geological Info -->
            <div class="border-t border-muted pt-4 space-y-3">
              <h4 class="font-bold text-default">Interpretación Geoquímica (Calizas del Cesar)</h4>
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted">Textura: <b class="text-default">{{ sample.petrografia }}</b>, Mineral dominante: <b class="text-default">{{ sample.drx }}</b></p>
                <div v-if="geologyWarnings.length > 0" class="space-y-1.5">
                  <div v-for="w in geologyWarnings" :key="w" class="p-2.5 bg-muted text-default text-xs rounded border border-muted flex gap-2">
                    <span>⚠️</span>
                    <span>{{ w }}</span>
                  </div>
                </div>
                <div v-else class="p-2 bg-success/10 text-success border border-success/20 text-xs rounded">
                  La muestra presenta óptimos rangos recomendados para calizas de alta calidad.
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Clinker Bogue Tab -->
        <template #clinker>
          <div class="py-4 space-y-6">
            <p class="text-sm text-muted">Composición potencial de fases minerales del cemento obtenida mediante ecuaciones estequiométricas de Bogue:</p>

            <div class="p-3 bg-warning/10 border-l-4 border-warning rounded text-xs text-default">
              <b>Estimación indicativa.</b> Bogue describe la composición de un <b>clinker</b>, no de una caliza. Una caliza pura no se clinkeriza sola: necesita aporte de sílice y arcilla, así que estos valores no suman 100% ni representan un cemento real. Úselos para comparar el aporte relativo de la caliza entre muestras, no como composición del producto.
            </div>

            <div class="space-y-4">
              <!-- Alita -->
              <div class="space-y-1">
                <div class="flex justify-between text-sm font-semibold">
                  <span class="text-default">Alita (C3S)</span>
                  <span class="text-primary">{{ sample.c3s }}%</span>
                </div>
                <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div class="bg-primary h-2 rounded-full" :style="`width: ${Math.min(sample.c3s || 0, 100)}%`"></div>
                </div>
                <p class="text-xs text-dimmed">Favorece y controla la resistencia mecánica inicial (temprana) del hormigón.</p>
              </div>

              <!-- Belita -->
              <div class="space-y-1">
                <div class="flex justify-between text-sm font-semibold">
                  <span class="text-default">Belita (C2S)</span>
                  <span class="text-primary">{{ sample.c2s }}%</span>
                </div>
                <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div class="bg-primary h-2 rounded-full" :style="`width: ${Math.min(sample.c2s || 0, 100)}%`"></div>
                </div>
                <p class="text-xs text-dimmed">Aporta a la ganancia de resistencia a largo plazo (tardía).</p>
              </div>

              <!-- Aluminato Tricálcico -->
              <div class="space-y-1">
                <div class="flex justify-between text-sm font-semibold">
                  <span class="text-default">Aluminato Tricálcico (C3A)</span>
                  <span class="text-warning">{{ sample.c3a }}%</span>
                </div>
                <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div class="bg-warning h-2 rounded-full" :style="`width: ${Math.min(sample.c3a || 0, 100)}%`"></div>
                </div>
                <p class="text-xs text-dimmed">Reacción ultra rápida con agua, gobierna los tiempos de fraguado inicial.</p>
              </div>

              <!-- Ferritoaluminato Tetracálcico -->
              <div class="space-y-1">
                <div class="flex justify-between text-sm font-semibold">
                  <span class="text-default">Ferritoaluminato Tetracálcico (C4AF)</span>
                  <span class="text-info">{{ sample.c4af }}%</span>
                </div>
                <div class="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div class="bg-info h-2 rounded-full" :style="`width: ${Math.min(sample.c4af || 0, 100)}%`"></div>
                </div>
                <p class="text-xs text-dimmed">Funciona como fundente principal dentro del horno reduciendo temperaturas.</p>
              </div>
            </div>
          </div>
        </template>

        <!-- 17 Industrial Profiles Tab -->
        <template #perfiles>
          <div class="py-4 space-y-4">
            <p class="text-sm text-muted">Dictamen sobre 17 perfiles de uso industrial para esta caliza:</p>

            <div class="space-y-3">
              <div v-for="p in sample.dictamenes" :key="p.nombre" class="p-4 border border-muted rounded-xl hover:shadow-sm transition-shadow">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h5 class="font-bold text-sm text-default">{{ p.nombre }}</h5>
                    <p class="text-xs text-muted mt-0.5 leading-tight">{{ p.aplicacion }}</p>
                    <p class="text-xs text-default mt-2 italic">“{{ p.razon }}”</p>
                    <p class="text-3xs text-dimmed mt-1">Norma reguladora: {{ p.norma }}</p>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <UBadge
                      :color="p.estado === 'Apto' ? 'success' : p.estado === 'No Apto' ? 'error' : 'warning'"
                      variant="subtle"
                    >
                      {{ p.estado }}
                    </UBadge>
                    <UBadge v-if="p.confianza && p.confianza !== 'Alta'" color="neutral" variant="outline" size="xs">
                      Confianza: {{ p.confianza }}
                    </UBadge>
                  </div>
                </div>
                <div v-if="p.salvedades?.length" class="mt-3 pt-3 border-t border-muted space-y-1.5">
                  <p v-for="s in p.salvedades" :key="s" class="text-xs text-muted flex gap-1.5">
                    <span class="shrink-0">⚠️</span><span>{{ s }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- AI Interpretation Tab -->
        <template #ia>
          <div class="py-4 space-y-4">
            <p class="text-sm text-muted">
              Redacción en lenguaje natural sobre los resultados y dictámenes ya calculados. La IA explica; los valores y el dictamen normativo son deterministas y no cambian.
            </p>

            <div v-if="iaTexto" class="p-4 bg-muted border border-muted rounded-xl text-sm text-default leading-relaxed whitespace-pre-wrap">{{ iaTexto }}</div>
            <p v-if="iaTexto && iaFecha" class="text-xs text-dimmed">Guardada el {{ iaFecha }} — se reutiliza sin volver a consultar la IA.</p>

            <div v-if="iaError" class="p-3 bg-error/10 border border-error/30 text-error rounded text-sm">
              {{ iaError }}
            </div>

            <UButton
              color="primary"
              :variant="iaTexto ? 'soft' : 'solid'"
              icon="i-heroicons-sparkles"
              :loading="iaLoading"
              @click="generarInterpretacion"
            >
              {{ iaTexto ? 'Regenerar interpretación' : 'Generar interpretación' }}
            </UButton>
          </div>
        </template>
      </UTabs>
    </div>
  </UCard>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getGeologyWarnings } from '~/utils/geologia'

const props = defineProps({
  sample: { type: Object, required: true }
})

const geologyWarnings = computed(() => getGeologyWarnings(props.sample))

const EVALUADOS = ['CaO', 'MgO', 'SiO2', 'Fe2O3', 'Al2O3', 'SO3', 'Na2O', 'K2O', 'P2O5', 'Pb', 'Cd', 'As']
const elementos = computed(() => props.sample?.elementos ?? [])

// La interpretación vive en la BD: al abrir una muestra se muestra la guardada
// y solo se llama a la IA si no existe o si el usuario pide regenerarla.
const iaTexto = ref(props.sample?.interpretacion_ia || '')
const iaFecha = ref(props.sample?.interpretacion_fecha || '')
const iaError = ref('')
const iaLoading = ref(false)

watch(() => props.sample?.id_muestra, () => {
  iaTexto.value = props.sample?.interpretacion_ia || ''
  iaFecha.value = props.sample?.interpretacion_fecha || ''
  iaError.value = ''
})

async function generarInterpretacion() {
  iaLoading.value = true
  iaError.value = ''
  try {
    const res = await $fetch('/api/interpretar', { method: 'POST', body: { muestra: props.sample } })
    iaTexto.value = res.interpretacion
    iaFecha.value = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  } catch (e) {
    iaError.value = e?.data?.statusMessage || e?.statusMessage || 'No se pudo generar la interpretación.'
  } finally {
    iaLoading.value = false
  }
}
</script>