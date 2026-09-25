<script setup lang="ts">
const form = defineModel<any>('form', { required: true })
defineProps<{ loading: boolean; drxOptions: unknown[]; petrografiaOptions: unknown[] }>()
defineEmits(['submit'])

const fields = [
  ['caco3', 'CaCO₃ (%)', 'Ej: 94.8', '%'], ['cao', 'CaO (%)', 'Ej: 54.1', '%'], ['mgo', 'MgO (%)', 'Ej: 0.8', '%'], ['sio2', 'SiO₂ (%)', 'Ej: 6.4', '%'], ['fe2o3', 'Fe₂O₃ (%)', 'Ej: 1.9', '%'], ['al2o3', 'Al₂O₃ (%)', 'Ej: 2.8', '%'], ['so3', 'SO₃ (%)', 'Ej: 2.4', '%'], ['na2o', 'Na₂O (%)', 'Sin dato', '%'], ['k2o', 'K₂O (%)', 'Sin dato', '%'], ['p2o5', 'P₂O₅ (%)', 'Sin dato', '%'], ['pb', 'Plomo - Pb (ppm)', 'Sin dato', 'ppm'], ['cd', 'Cadmio - Cd (ppm)', 'Sin dato', 'ppm'], ['as_ppm', 'Arsénico - As (ppm)', 'Sin dato', 'ppm']
]
const extras = [['pn', 'Poder Neutralizante PN (%)'], ['blancura', 'Blancura (%)'], ['tamano_particula', 'Tamaño Partícula (µm)'], ['humedad', 'Humedad (%)'], ['cao_disponible', 'CaO Disponible (%)'], ['cao_reactivo', 'CaO Reactivo (%)'], ['resistencia', 'Resistencia (MPa)'], ['absorcion', 'Absorción (%)']]
</script>

<template>
  <div class="mx-auto max-w-5xl"><UCard class="shadow-sm"><template #header><div class="flex items-center gap-2"><UIcon name="i-heroicons-pencil-square" class="h-5 w-5 text-emerald-500" /><h3 class="font-bold text-slate-800">Formulario Químico Completo</h3></div></template>
    <form class="space-y-6" @submit.prevent="$emit('submit')">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AppField v-model="form.id_muestra" label="ID Muestra *" required placeholder="Ej: CAR-001" color="success" />
        <AppField v-for="field in fields" :key="field[0]" v-model.number="form[field[0]]" :label="field[1]" type="number" step="any" min="0" :max="field[3] === '%' ? 100 : undefined" :placeholder="field[2]" color="success" />
        <AppSelect v-model="form.drx" label="Fase Mineral Dominante (DRX)" :items="drxOptions" color="success" />
        <AppSelect v-model="form.petrografia" label="Textura Dominante (Petrografía)" :items="petrografiaOptions" color="success" />
      </div>
      <UAccordion color="neutral" variant="soft" :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', slot: 'fields' }]">
        <template #fields><div class="grid grid-cols-1 gap-4 rounded-b-lg border border-slate-100 bg-white p-4 md:grid-cols-2"><AppField v-for="field in extras" :key="field[0]" v-model.number="form.extras[field[0]]" :label="field[1]" type="number" step="any" min="0" placeholder="Opcional" color="success" /></div></template>
      </UAccordion>
      <div class="flex justify-end border-t border-slate-100 pt-6"><UButton type="submit" color="success" icon="i-heroicons-check-circle" :loading="loading">Evaluar y Registrar Muestra</UButton></div>
    </form>
  </UCard></div>
</template>
