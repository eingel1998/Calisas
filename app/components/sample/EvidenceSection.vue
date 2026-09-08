<script setup lang="ts">
defineProps<{ sample?: any; file?: File | null; confirmed: boolean; replace: boolean; loading: boolean; apiBase: string }>()
const emit = defineEmits(['select', 'update:confirmed', 'update:replace', 'upload'])
</script>

<template>
  <AppSection title="PDF de evidencia" description="Un PDF por muestra, hasta 10 MiB. Se conserva como respaldo; no interviene en el análisis.">
    <p v-if="sample?.evidencia" class="text-sm">{{ sample.evidencia.nombre }} · {{ sample.evidencia.fecha }} <a :href="`${apiBase}/historial/${encodeURIComponent(sample.id_muestra)}/evidencia`" target="_blank" rel="noopener" class="text-emerald-700 underline">Descargar PDF</a></p>
    <label class="block text-sm font-medium text-slate-700">Seleccionar evidencia PDF<input :key="sample?.id_muestra" type="file" accept=".pdf,application/pdf" class="mt-1 block" @change="emit('select', $event)" /></label>
    <p v-if="file" class="text-sm">Archivo seleccionado: {{ file.name }}</p>
    <label class="flex gap-2 text-sm"><input :checked="confirmed" type="checkbox" @change="emit('update:confirmed', ($event.target as HTMLInputElement).checked)" /> Confirmo que el documento corresponde a esta muestra.</label>
    <label v-if="sample?.evidencia" class="flex gap-2 text-sm"><input :checked="replace" type="checkbox" @change="emit('update:replace', ($event.target as HTMLInputElement).checked)" /> Confirmo reemplazar la evidencia existente.</label>
    <UButton :disabled="!file || !confirmed || (!!sample?.evidencia && !replace)" :loading="loading" @click="emit('upload')">{{ sample?.evidencia ? 'Reemplazar evidencia' : 'Adjuntar evidencia' }}</UButton>
  </AppSection>
</template>
