<template>
  <UCard class="shadow-sm">
    <template #header>
      <h3 class="font-bold text-default">Muestras Evaluadas</h3>
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
            <th class="py-3 px-4">LSF</th>
            <th class="py-3 px-4">Veredicto</th>
            <th class="py-3 px-4">Fecha</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-muted">
          <tr
            v-for="s in samples"
            :key="s.id_muestra"
            :class="[
              'cursor-pointer transition-colors',
              s.id_muestra === selectedId ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted'
            ]"
            @click="emit('select', s)"
          >
            <td class="py-3 px-4 font-bold text-default">{{ s.id_muestra }}</td>
            <td class="py-3 px-4">{{ s.caco3 }}%</td>
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
</template>

<script setup>
defineProps({
  samples: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' }
})
const emit = defineEmits(['select'])
</script>