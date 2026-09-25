<script setup lang="ts">
defineProps<{
  sample?: any
  chemicalFields: Array<{ key: string; label: string; unit: string }>
  showNumber: (value: any, unit?: string) => string
  chemicalText: (text: string) => string
  file?: File | null
  confirmed: boolean
  replace: boolean
  loading: boolean
  apiBase: string
}>()
const emit = defineEmits(['select-evidence', 'update:confirmed', 'update:replace', 'upload-evidence'])
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2 rounded-xl border bg-slate-50 p-4"><p class="font-semibold">{{ sample?.resumen ? `${sample.resumen.aptos} cumplen · ${sample.resumen.no_aptos} incumplen · ${sample.resumen.pendientes} requieren ensayos` : 'Resultado no disponible' }}</p><p v-if="sample?.version_evaluacion !== 2" class="text-sm text-amber-800">Histórico · evaluación anterior. Se conserva sin recalcular.</p><p class="text-xs text-slate-600">Cumplimiento de los criterios configurados; no constituye certificación normativa.</p></div>
    <IndustrialProfiles :dictamenes="sample?.dictamenes" :chemical-text="chemicalText" :show-number="showNumber" />
    <AppSection title="Lugar de muestreo"><p class="text-sm">Coordenadas: {{ sample?.coordenadas_muestreo || 'Sin dato' }}</p><p class="text-sm">Dirección específica: {{ sample?.direccion_muestreo || 'Sin dato' }}</p></AppSection>
    <AppSection title="Datos del análisis">
      <p class="text-sm">Base declarada: {{ sample?.contexto?.base || 'No registrada' }} · Base de trazas: {{ sample?.contexto?.base_trazas || 'No registrada' }}</p>
      <p v-if="sample?.contexto?.convertir" class="text-sm">Conversión aplicada a base seca. LOI: {{ showNumber(sample.contexto.loi, '%') }}.</p>
      <AppTable label="Datos del análisis"><template #head><tr><th class="px-3 py-2">Parámetro</th><th class="px-3 py-2">Valor usado</th><th class="px-3 py-2">Procedencia</th></tr></template><tr v-for="field in chemicalFields" :key="field.key"><td class="px-3 py-2">{{ field.label }}</td><td class="px-3 py-2">{{ showNumber(sample?.[field.key], field.unit) }}</td><td class="px-3 py-2">{{ sample?.contexto?.procedencia?.[field.key] || 'No registrada' }}</td></tr></AppTable>
      <p class="text-sm">DRX: {{ sample?.drx || 'Sin dato' }} · Petrografía: {{ sample?.petrografia || 'Sin dato' }}</p>
      <OriginalCompositionTable :originales="sample?.contexto?.originales" :chemical-text="chemicalText" />
      <details v-if="Object.keys(sample?.contexto?.metadatos || {}).length" class="text-sm"><summary class="cursor-pointer font-semibold">Información del ensayo</summary><dl class="mt-2 space-y-1"><div v-for="(value, field) in sample.contexto.metadatos" :key="field"><dt class="font-medium">{{ field }}</dt><dd>{{ value }}</dd></div></dl></details>
      <details v-if="sample?.contexto?.texto_reporte" class="text-sm"><summary class="cursor-pointer">Texto íntegro extraído del informe</summary><pre class="mt-2 whitespace-pre-wrap text-xs">{{ sample.contexto.texto_reporte }}</pre></details>
      <p class="text-xs text-slate-600">LSF: {{ showNumber(sample?.lsf) }} · SM: {{ showNumber(sample?.sm) }}. Relaciones calculadas; no determinan por sí solas la aptitud de la roca.</p>
    </AppSection>
    <EvidenceSection :sample="sample" :file="file" :confirmed="confirmed" :replace="replace" :loading="loading" :api-base="apiBase" @select="emit('select-evidence', $event)" @update:confirmed="emit('update:confirmed', $event)" @update:replace="emit('update:replace', $event)" @upload="emit('upload-evidence')" />
  </div>
</template>
