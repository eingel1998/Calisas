<script setup lang="ts">
const options = defineModel<any>('options', { required: true })
defineProps<{ baseOptions: unknown[]; isBatch: boolean }>()
</script>

<template>
  <section class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <h3 class="font-semibold">Base de los resultados {{ isBatch ? '(común a todas las filas)' : '' }}</h3>
    <p class="text-sm text-slate-600">Confirma la base con el informe del laboratorio. Un campo vacío significa “Sin dato”. Los valores originales se conservan y la conversión se aplica al evaluar.</p>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <AppSelect v-model="options.base" label="Base analítica" :items="baseOptions" color="success" />
      <AppSelect v-model="options.base_trazas" label="Base de las trazas (ppm)" :items="baseOptions" color="success" />
      <AppField v-model.number="options.loi" label="LOI medido (%)" type="number" min="0" max="100" step="any" placeholder="Sin dato" color="success" />
    </div>
    <UCheckbox v-model="options.convertir" color="success" :disabled="options.base !== 'calcinada'" label="Convertir de base calcinada a seca" />
    <UCheckbox v-model="options.estimar_loi" color="success" :disabled="options.base !== 'calcinada' || !options.convertir || (options.loi !== null && options.loi !== '')" label="Estimar LOI si falta (informativo; no sustituye un ensayo)" />
  </section>
</template>
