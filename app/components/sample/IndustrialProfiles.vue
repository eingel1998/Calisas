<script setup lang="ts">
defineProps<{
  dictamenes?: any[]
  chemicalText: (text: string) => string
  showNumber: (value: number | null | undefined, unit?: string) => string
}>()
</script>

<template>
  <AppSection title="Perfiles de uso industrial" description="“Requiere ensayos” aparece cuando falta un valor numérico exigido. Los valores calculados se identifican por su procedencia y las comprobaciones adicionales se muestran como observaciones.">
    <p v-if="!dictamenes?.length" class="text-sm text-slate-600">Dictámenes no disponibles.</p>
    <details v-for="profile in dictamenes || []" :key="profile.nombre" class="rounded-lg border border-slate-200 p-3 text-sm">
      <summary class="cursor-pointer font-semibold text-slate-900">{{ profile.nombre }} · {{ profile.estado }}</summary>
      <p class="mt-2">{{ chemicalText(profile.aplicacion) }}</p><p class="mt-2">{{ chemicalText(profile.razon) }}</p>
      <p class="mt-1 text-xs text-slate-500">Referencia: {{ profile.norma }}</p>
      <AppTable v-if="profile.criterios?.length" class="mt-3" label="Criterios del perfil">
        <template #head><tr><th class="px-3 py-2">Criterio</th><th class="px-3 py-2">Valor</th><th class="px-3 py-2">Límite</th><th class="px-3 py-2">Procedencia</th><th class="px-3 py-2">Resultado</th></tr></template>
        <tr v-for="(criterion, index) in profile.criterios" :key="index"><td class="px-3 py-2">{{ chemicalText(criterion.etiqueta) }}</td><td class="px-3 py-2">{{ showNumber(criterion.valor, criterion.unidad) }}</td><td class="px-3 py-2">{{ criterion.op }} {{ showNumber(criterion.limite, criterion.unidad) }}</td><td class="px-3 py-2">{{ criterion.procedencia || 'No registrada' }}</td><td class="px-3 py-2">{{ criterion.estado }}</td></tr>
      </AppTable>
      <ul v-if="profile.pendientes?.length" class="mt-2 list-disc pl-5 text-amber-800"><li v-for="(pending, index) in profile.pendientes" :key="index">{{ chemicalText(pending) }}</li></ul>
      <div v-if="profile.observaciones?.length" class="mt-2 text-slate-600"><p class="font-medium">Observaciones recomendadas:</p><ul class="list-disc pl-5"><li v-for="(note, index) in profile.observaciones" :key="index">{{ chemicalText(note) }}</li></ul></div>
    </details>
  </AppSection>
</template>
