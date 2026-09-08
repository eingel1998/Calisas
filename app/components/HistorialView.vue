<template>
  <div class="space-y-6">
    <UCard class="shadow-sm">
      <template #header>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 class="font-bold text-default">Registros Históricos</h3>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Search bar -->
            <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Buscar ID..." color="primary" class="w-64" />

            <!-- Filter status -->
            <USelect v-model="filterStatus" :options="['Todos', 'APTO', 'NO APTO']" color="primary" class="w-32" />

            <!-- Export Button -->
            <UButton color="primary" variant="outline" icon="i-heroicons-document-arrow-down" @click="emit('exportExcel')">
              Excel
            </UButton>
          </div>
        </div>
      </template>

      <!-- Table of all items -->
      <div v-if="filteredSamples.length === 0" class="p-8 text-center text-dimmed">
        No se encontraron muestras registradas con los filtros seleccionados.
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
              <th class="py-3 px-4">Veredicto Cemento</th>
              <th class="py-3 px-4">Fecha Registro</th>
              <th class="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted">
            <tr v-for="s in filteredSamples" :key="s.id_muestra" class="hover:bg-muted/80 transition-colors cursor-pointer" @click="emit('openSample', s)">
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
              <td class="py-3 px-4 text-right" @click.stop>
                <div class="flex justify-end gap-1">
                  <UButton color="neutral" variant="ghost" icon="i-heroicons-eye" @click="emit('openSample', s)" />
                  <UButton color="error" variant="ghost" icon="i-heroicons-trash" @click="emit('deleteSample', s.id_muestra)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  samples: { type: Array, default: () => [] }
})
const searchQuery = defineModel('searchQuery', { type: String, default: '' })
const filterStatus = defineModel('filterStatus', { type: String, default: 'Todos' })
const emit = defineEmits(['openSample', 'deleteSample', 'exportExcel'])

const filteredSamples = computed(() => {
  return props.samples.filter(s => {
    const matchesSearch = s.id_muestra.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = filterStatus.value === 'Todos' || s.estado_eval === filterStatus.value
    return matchesSearch && matchesStatus
  })
})
</script>