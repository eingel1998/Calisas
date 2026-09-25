<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ samples: Array<{ id_muestra: string; coordenadas_muestreo?: string | null; direccion_muestreo?: string | null }>; apiBase: string }>()
const toast = useToast()
const id = ref('')
const loading = ref(false)
const empty = () => ({ tecnica: 'TGA/DTG', laboratorio: '', fecha_ensayo: '', atmosfera: '', tasa_calentamiento: null as number | null,
  temperatura_inicio: null as number | null, temperatura_fin: null as number | null, temperatura_evento: null as number | null, perdida_masa: null as number | null, observaciones: '' })
const form = ref(empty())
const api = () => `${props.apiBase}/historial/${encodeURIComponent(id.value)}/termicas`
const fields: Array<{ key: 'tasa_calentamiento' | 'temperatura_inicio' | 'temperatura_fin' | 'temperatura_evento' | 'perdida_masa'; label: string; max: number }> = [
  { key: 'tasa_calentamiento', label: 'Tasa de calentamiento (°C/min)', max: 1000 },
  { key: 'temperatura_inicio', label: 'Temperatura inicial (°C)', max: 3000 },
  { key: 'temperatura_fin', label: 'Temperatura final (°C)', max: 3000 },
  { key: 'temperatura_evento', label: 'Temperatura del evento observado (°C)', max: 3000 },
  { key: 'perdida_masa', label: 'Pérdida de masa medida (%)', max: 100 },
]
watch(id, async actual => {
  form.value = empty()
  if (!actual) return
  try { form.value = { ...empty(), ...((await $fetch(api())) || {}) } }
  catch (e: any) { toast.add({ title: 'No se pudo cargar el ensayo térmico', description: e.data?.statusMessage, color: 'error' }) }
})
async function save() {
  loading.value = true
  try {
    await $fetch(api(), { method: 'PUT', body: form.value })
    toast.add({ title: 'Ensayo térmico guardado', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo guardar el ensayo', description: e.data?.statusMessage || e.statusMessage, color: 'error' }) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="space-y-5"><div><h2 class="text-2xl font-bold">Análisis de propiedades térmicas</h2><p class="text-sm text-slate-600">Registra resultados medidos por el laboratorio. La pérdida de masa y las temperaturas no se deducen de FRX, DRX ni de fotografías. Si la muestra aún no existe, regístrala en Evaluación geoquímica → FRX manual; los químicos pueden quedar vacíos.</p></div>
    <UCard><form class="space-y-4" @submit.prevent="save">
      <label class="block text-sm font-semibold">Muestra registrada<select v-model="id" required class="mt-1 block w-full rounded border p-2"><option value="">Selecciona una muestra</option><option v-for="sample in samples" :key="sample.id_muestra" :value="sample.id_muestra">{{ sample.id_muestra }}</option></select></label>
      <div v-if="id" class="space-y-4"><p class="text-sm text-slate-600">Coordenadas: {{ samples.find(s => s.id_muestra === id)?.coordenadas_muestreo || 'Sin dato' }} · Dirección: {{ samples.find(s => s.id_muestra === id)?.direccion_muestreo || 'Sin dato' }}</p>
        <div class="grid gap-3 md:grid-cols-2"><label class="block text-sm font-semibold">Técnica<select v-model="form.tecnica" class="mt-1 block w-full rounded border p-2"><option>TGA/DTG</option><option>DSC</option><option>DTA</option><option>TGA-DSC</option></select></label><AppField v-model="form.laboratorio" label="Laboratorio / fuente" /><AppField v-model="form.fecha_ensayo" label="Fecha del ensayo" type="date" /><AppField v-model="form.atmosfera" label="Atmósfera del ensayo" placeholder="Ej: aire, N₂" /><AppField v-for="field in fields" :key="field.key" v-model.number="form[field.key]" :label="field.label" type="number" min="0" :max="field.max" step="any" /></div>
        <label class="block text-sm font-semibold">Observaciones del informe<textarea v-model="form.observaciones" rows="4" class="mt-1 block w-full rounded border p-2" /></label>
        <UButton type="submit" color="success" :loading="loading">Guardar ensayo térmico</UButton>
      </div>
    </form></UCard>
  </div>
</template>
