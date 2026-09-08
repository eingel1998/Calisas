<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <UCard class="shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted">Total Muestras</p>
            <p class="text-3xl font-bold text-default mt-1">{{ samples.length }}</p>
          </div>
          <div class="p-3 bg-info/10 text-info rounded-full">
            <UIcon name="i-heroicons-document-text" class="w-6 h-6" />
          </div>
        </div>
      </UCard>

      <UCard class="shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted">Aptas Cemento</p>
            <p class="text-3xl font-bold text-primary mt-1">{{ aptasCount }}</p>
          </div>
          <div class="p-3 bg-success/10 text-success rounded-full">
            <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
          </div>
        </div>
      </UCard>

      <UCard class="shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted">No Aptas Cemento</p>
            <p class="text-3xl font-bold text-error mt-1">{{ noAptasCount }}</p>
          </div>
          <div class="p-3 bg-error/10 text-error rounded-full">
            <UIcon name="i-heroicons-x-circle" class="w-6 h-6" />
          </div>
        </div>
      </UCard>

      <UCard class="shadow-sm bg-gradient-to-br from-primary to-primary-600 text-inverted">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium opacity-90">Tasa de Aprobación</p>
            <p class="text-3xl font-bold mt-1">{{ aprobacionPct }}%</p>
          </div>
          <div class="p-3 bg-inverted/10 text-inverted rounded-full">
            <UIcon name="i-heroicons-presentation-chart-line" class="w-6 h-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard class="shadow-sm">
        <template #header>
          <h3 class="font-bold text-default flex items-center gap-2">
            <UIcon name="i-heroicons-bolt" class="text-primary w-5 h-5" />
            Acceso Rápido
          </h3>
        </template>
        <p class="text-sm text-muted mb-4">Empieza evaluando una nueva muestra ingresando sus componentes químicos o cargando un archivo XRF.</p>
        <div class="flex gap-3">
          <UButton color="primary" @click="emit('openModal', 'manual')">
            Entrada Manual
          </UButton>
          <UButton color="neutral" variant="soft" @click="emit('openModal', 'pdf')">
            Subir PDF / Imagen
          </UButton>
        </div>
      </UCard>

      <UCard class="shadow-sm">
        <template #header>
          <h3 class="font-bold text-default flex items-center gap-2">
            <UIcon name="i-heroicons-arrow-down-tray" class="text-primary w-5 h-5" />
            Descargar Base de Datos
          </h3>
        </template>
        <p class="text-sm text-muted mb-4">Descarga el archivo Excel estructurado con todas las muestras registradas e históricos de dictámenes.</p>
        <UButton color="primary" variant="outline" icon="i-heroicons-document-arrow-down" @click="emit('exportExcel')">
          Descargar BaseDatos_Calizas.xlsx
        </UButton>
      </UCard>
    </div>

    <!-- Latest Samples -->
    <UCard class="shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-default">Muestras Recientes</h3>
          <UButton variant="link" color="primary" @click="emit('openAll')">Ver todo</UButton>
        </div>
      </template>

      <div v-if="samples.length === 0" class="p-8 text-center text-dimmed">
        No hay muestras registradas en la base de datos todavía.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-default border-collapse">
          <thead>
            <tr class="border-b border-muted bg-muted/50 text-muted font-semibold">
              <th class="py-3 px-4">ID Muestra</th>
              <th class="py-3 px-4">CaCO3 (%)</th>
              <th class="py-3 px-4">CaO (%)</th>
              <th class="py-3 px-4">SiO2 (%)</th>
              <th class="py-3 px-4">LSF</th>
              <th class="py-3 px-4">Veredicto</th>
              <th class="py-3 px-4">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted">
            <tr v-for="s in recentSamples" :key="s.id_muestra" class="hover:bg-muted/80 transition-colors cursor-pointer" @click="emit('openSample', s)">
              <td class="py-3 px-4 font-bold text-default">{{ s.id_muestra }}</td>
              <td class="py-3 px-4">{{ s.caco3 }}%</td>
              <td class="py-3 px-4">{{ s.cao }}%</td>
              <td class="py-3 px-4">{{ s.sio2 }}%</td>
              <td class="py-3 px-4 font-mono">{{ s.lsf?.toFixed(3) }}</td>
              <td class="py-3 px-4">
                <UBadge :color="s.estado_eval === 'APTO' ? 'success' : 'error'" variant="subtle">
                  {{ s.estado_eval }}
                </UBadge>
              </td>
              <td class="py-3 px-4 text-xs text-muted">{{ s.fecha_registro }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  samples: { type: Array, default: () => [] }
})
const emit = defineEmits(['openSample', 'openModal', 'openAll', 'exportExcel'])

const aptasCount = computed(() => props.samples.filter(s => s.estado_eval === 'APTO').length)
const noAptasCount = computed(() => props.samples.filter(s => s.estado_eval === 'NO APTO').length)
const aprobacionPct = computed(() =>
  props.samples.length > 0 ? Math.round((aptasCount.value / props.samples.length) * 100) : 0
)
const recentSamples = computed(() => props.samples.slice(0, 5))
</script>