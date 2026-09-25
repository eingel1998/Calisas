<script setup lang="ts">
import { ref, watch } from 'vue'

const EXTRAS = ['pn', 'blancura', 'tamano_particula', 'humedad', 'cao_disponible', 'cao_reactivo', 'resistencia', 'absorcion']

const props = defineProps<{ sample: any; apiBase: string; chemicalFields: Array<{ key: string; label: string; unit: string }> }>()
const emit = defineEmits(['saved', 'cancel'])
const toast = useToast()
const loading = ref(false)
const form = ref<any>({})
const options = [{ label: 'No registrada', value: 'desconocida' }, { label: 'Seca', value: 'seca' }, { label: 'Calcinada', value: 'calcinada' }]
const extraLabels: Record<string, string> = { pn: 'Poder neutralizante (%)', blancura: 'Blancura (%)', tamano_particula: 'Tamaño partícula (µm)', humedad: 'Humedad (%)', cao_disponible: 'CaO disponible (%)', cao_reactivo: 'CaO reactivo (%)', resistencia: 'Resistencia (MPa)', absorcion: 'Absorción (%)' }
watch(() => props.sample, (sample) => {
  if (!sample) return
  const c = sample.contexto || {}
  form.value = {
    datos: Object.fromEntries(props.chemicalFields.filter(f => f.key !== 'loi').map(f => [f.key, c.entrada?.[f.key] ?? sample[f.key] ?? null])),
    extras: Object.fromEntries(EXTRAS.map(k => [k, sample[k] ?? c.usados?.[k] ?? null])),
    drx: sample.drx || '', petrografia: sample.petrografia || '',
    contexto: { base: c.base || 'desconocida', base_trazas: c.base_trazas || 'desconocida', convertir: Boolean(c.convertir), estimar_loi: Boolean(c.estimar_loi), loi: c.procedencia?.loi === 'estimado' ? null : c.loi ?? null, originales: c.originales || [], texto_reporte: c.texto_reporte || '' },
  }
}, { immediate: true })
async function save() {
  loading.value = true
  try {
    await $fetch(`${props.apiBase}/historial/${encodeURIComponent(props.sample.id_muestra)}`, {
      method: 'PUT', body: { fecha_modificacion: props.sample.fecha_modificacion || null,
        datos: { ...form.value.datos, id_muestra: props.sample.id_muestra, extras: form.value.extras, drx: form.value.drx, petrografia: form.value.petrografia, contexto: form.value.contexto } },
    })
    toast.add({ title: 'Muestra actualizada y dictámenes recalculados', color: 'success' })
    emit('saved')
  } catch (e: any) { toast.add({ title: 'No se pudo actualizar', description: e.data?.statusMessage || e.statusMessage, color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <form v-if="sample?.version_evaluacion === 2 && form.contexto" class="space-y-5" @submit.prevent="save">
    <p class="text-sm text-slate-600">Edita las entradas originales de {{ sample.id_muestra }}. Los dictámenes se recalcularán; el PDF de evidencia y las fotografías se conservan.</p>
    <div class="grid gap-3 md:grid-cols-2"><AppField v-for="field in chemicalFields.filter(f => f.key !== 'loi')" :key="field.key" v-model.number="form.datos[field.key]" :label="`${field.label} (${field.unit})`" type="number" min="0" :max="field.unit === '%' ? 100 : undefined" step="any" /></div>
    <div class="grid gap-3 md:grid-cols-2"><AppField v-for="key in EXTRAS" :key="key" v-model.number="form.extras[key]" :label="extraLabels[key]" type="number" min="0" step="any" /></div>
    <div class="grid gap-3 md:grid-cols-2"><AppSelect v-model="form.contexto.base" label="Base analítica" :items="options" /><AppSelect v-model="form.contexto.base_trazas" label="Base de trazas" :items="options" /><AppField v-model.number="form.contexto.loi" label="LOI medido (%)" type="number" min="0" max="100" step="any" /><AppField v-model="form.drx" label="DRX dominante (dato anterior)" /><AppField v-model="form.petrografia" label="Textura petrográfica (dato anterior)" /></div>
    <label class="flex items-center gap-2 text-sm"><input v-model="form.contexto.convertir" type="checkbox" /> Convertir de base calcinada a seca</label>
    <label class="flex items-center gap-2 text-sm"><input v-model="form.contexto.estimar_loi" type="checkbox" /> Estimar LOI cuando falta medición</label>
    <div class="flex gap-3"><UButton type="submit" color="success" :loading="loading">Guardar cambios</UButton><UButton color="neutral" variant="outline" @click="emit('cancel')">Cancelar</UButton></div>
  </form>
  <p v-else class="text-sm text-amber-800">El registro histórico no conserva todas las entradas necesarias para recalcularlo con seguridad.</p>
</template>
