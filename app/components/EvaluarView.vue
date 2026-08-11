<template>
  <div class="space-y-6">
    <!-- Actions header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-lg font-bold text-default">Evaluación geoquímica</h2>
      <div class="flex flex-wrap gap-3">
        <UButton color="primary" icon="i-heroicons-document-arrow-up" @click="emit('openModal', 'pdf')">
          PDF/Imagen
        </UButton>
        <UButton color="neutral" variant="soft" icon="i-heroicons-pencil-square" @click="emit('openModal', 'manual')">
          Manual
        </UButton>
        <UButton color="neutral" variant="outline" icon="i-heroicons-table-cells" @click="emit('openModal', 'batch')">
          Lote
        </UButton>
      </div>
    </div>

    <EmptyState v-if="samples.length === 0" @open-modal="emit('openModal', $event)" />

    <template v-else>
      <ResultCard :sample="selectedSample || samples[0]" />
      <SamplesTable :samples="samples" :selected-id="selectedSample?.id_muestra" @select="emit('selectSample', $event)" />
    </template>
  </div>
</template>

<script setup>
defineProps({
  samples: { type: Array, default: () => [] },
  selectedSample: { type: Object, default: null }
})
const emit = defineEmits(['openModal', 'selectSample'])
</script>
