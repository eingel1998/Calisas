<template>
  <div class="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-default rounded-2xl bg-elevated p-8">
    <div class="p-5 bg-primary/10 text-primary rounded-full border border-primary/20">
      <UIcon name="i-heroicons-beaker" class="w-12 h-12" />
    </div>
    <h3 class="text-xl font-bold text-default">No hay muestras evaluadas todavía</h3>
    <p class="text-sm text-muted max-w-md">
      Empieza evaluando una nueva muestra: carga un PDF/Imagen del laboratorio, ingresa los componentes químicos manualmente o sube un lote completo desde Excel/CSV.
    </p>
    <div class="flex flex-wrap gap-3 justify-center pt-2">
      <UButton color="primary" icon="i-heroicons-document-arrow-up" @click="emit('openModal', 'pdf')">
        PDF/Imagen
      </UButton>
      <UButton color="primary" variant="soft" icon="i-heroicons-pencil-square" @click="emit('openModal', 'manual')">
        Manual
      </UButton>
      <UButton color="primary" variant="outline" icon="i-heroicons-table-cells" @click="emit('openModal', 'batch')">
        Lote
      </UButton>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['openModal'])
</script>