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
        { label: '🏭 17 Perfiles de Uso', slot: 'perfiles' }
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
                  <UBadge
                    :color="p.estado === 'Apto' ? 'success' : p.estado === 'No Apto' ? 'error' : 'warning'"
                    variant="subtle"
                  >
                    {{ p.estado }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </UCard>
</template>

<script setup>
import { computed } from 'vue'
import { getGeologyWarnings } from '~/utils/geologia'

const props = defineProps({
  sample: { type: Object, required: true }
})

const geologyWarnings = computed(() => getGeologyWarnings(props.sample))
</script>