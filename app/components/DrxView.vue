<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ samples: Array<{ id_muestra: string }>; apiBase: string }>()
const id = ref('')
const laboratorio = ref('')
const fecha = ref('')
const observaciones = ref('')
const fases = ref<Array<{ mineral: string; porcentaje: number | null }>>([{ mineral: '', porcentaje: null }])
const loading = ref(false)
const toast = useToast()
const api = () => `${props.apiBase}/historial/${encodeURIComponent(id.value)}/drx`
watch(id, async actual => {
  laboratorio.value = ''; fecha.value = ''; observaciones.value = ''; fases.value = [{ mineral: '', porcentaje: null }]
  if (!actual) return
  try {
    const saved: any = await $fetch(api())
    laboratorio.value = saved.laboratorio || ''
    fecha.value = saved.fecha_ensayo || ''
    observaciones.value = saved.observaciones || ''
    if (saved.fases?.length) fases.value = saved.fases.map((f: any) => ({ mineral: f.mineral, porcentaje: f.porcentaje }))
  } catch (e: any) { toast.add({ title: 'No se pudo cargar DRX', description: e.data?.statusMessage, color: 'error' }) }
})
async function save() {
  loading.value = true
  try {
    await $fetch(api(), { method: 'PUT', body: { laboratorio: laboratorio.value, fecha_ensayo: fecha.value, observaciones: observaciones.value, fases: fases.value } })
    toast.add({ title: 'Fases DRX guardadas', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo guardar DRX', description: e.data?.statusMessage || e.statusMessage, color: 'error' }) }
  finally { loading.value = false }
}
</script>
<template>
  <div class="space-y-5"><div><h2 class="text-2xl font-bold">Difracción de rayos X (DRX)</h2><p class="text-sm text-slate-600">Registra las fases identificadas en un informe de laboratorio. El porcentaje es opcional y solo debe ingresarse si el laboratorio lo cuantificó.</p></div>
    <UCard><form class="space-y-4" @submit.prevent="save"><label class="block text-sm font-semibold">Muestra<select v-model="id" required class="mt-1 block w-full rounded border p-2"><option value="">Selecciona una muestra</option><option v-for="s in samples" :key="s.id_muestra" :value="s.id_muestra">{{ s.id_muestra }}</option></select></label>
      <template v-if="id"><div class="grid gap-3 md:grid-cols-2"><AppField v-model="laboratorio" label="Laboratorio / fuente" /><AppField v-model="fecha" label="Fecha del ensayo" type="date" /></div><div v-for="(fase, i) in fases" :key="i" class="flex flex-wrap items-end gap-2"><AppField v-model="fase.mineral" label="Fase mineral" required placeholder="Ej: calcita" /><AppField v-model.number="fase.porcentaje" label="Porcentaje reportado (opcional)" type="number" min="0" max="100" step="any" /><UButton v-if="fases.length > 1" color="error" variant="ghost" type="button" @click="fases.splice(i, 1)">Quitar</UButton></div><UButton type="button" variant="outline" @click="fases.push({ mineral: '', porcentaje: null })">Agregar fase</UButton><label class="block text-sm font-semibold">Observaciones del laboratorio<textarea v-model="observaciones" rows="4" class="mt-1 block w-full rounded border p-2" /></label><UButton type="submit" color="success" :loading="loading">Guardar DRX</UButton></template>
    </form></UCard>
  </div>
</template>
