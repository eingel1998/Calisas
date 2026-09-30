<script setup lang="ts">
import { ref, watch } from 'vue'

// Bloque de propiedades térmicas del panel de carga/edición. `nuevo`: la muestra aún no existe, no hay nada que cargar.
const props = defineProps<{ apiBase: string; sampleId?: string; nuevo?: boolean }>()
const toast = useToast()
const empty = () => ({ tecnica: 'Difusividad/Capacidad', sensor: 'SH-3', nivel_lectura: 'Alto', duracion_min: null as number | null, temperatura_muestra: null as number | null,
  fecha_ensayo: '', hora_ensayo: '', laboratorio: '', difusividad: null as number | null, capacidad_volumetrica: null as number | null, conductividad: null as number | null, syx: null as number | null, observaciones: '' })
const form = ref<Record<string, any>>(empty())
const api = (id: string) => `${props.apiBase}/historial/${encodeURIComponent(id)}/termicas`
const resultados = [
  { key: 'difusividad', label: 'D · Difusividad térmica (mm²/s)' },
  { key: 'capacidad_volumetrica', label: 'C · Capacidad calorífica volumétrica (MJ/m³·K)' },
  { key: 'conductividad', label: 'K · Conductividad térmica (W/m·K)' },
  { key: 'syx', label: 'Sᵧₓ · Error del ajuste' },
]

watch(() => props.sampleId, async id => {
  if (props.nuevo || !id) return
  try {
    const saved: any = await $fetch(api(id))
    // null del servidor no debe pisar los valores por defecto de los selects
    form.value = { ...empty(), ...Object.fromEntries(Object.entries(saved || {}).filter(([, v]) => v != null)) }
  } catch (e: any) { toast.add({ title: 'No se pudo cargar el ensayo térmico', description: e.data?.statusMessage, color: 'error' }) }
}, { immediate: true })

// Sin D, C ni K no hay ensayo que guardar. Los errores suben al panel, que los resume.
const tieneDatos = () => ['difusividad', 'capacidad_volumetrica', 'conductividad'].some(k => form.value[k] != null && form.value[k] !== '')
async function save(id: string) {
  if (!tieneDatos()) return
  await $fetch(api(id), { method: 'PUT', body: form.value })
}
defineExpose({ save, tieneDatos })
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-slate-500">Registra la lectura del equipo de propiedades termofísicas tal como aparece en pantalla.</p>
    <div class="grid gap-3 md:grid-cols-3">
      <label class="block text-sm font-semibold">Prueba<select v-model="form.tecnica" class="mt-1 block w-full rounded border p-2"><option>Difusividad/Capacidad</option><option>Conductividad</option></select></label>
      <label class="block text-sm font-semibold">Sensor<select v-model="form.sensor" class="mt-1 block w-full rounded border p-2"><option>SH-3</option><option>TR-3</option><option>KS-3</option><option>RK-3</option></select></label>
      <label class="block text-sm font-semibold">Nivel de lectura<select v-model="form.nivel_lectura" class="mt-1 block w-full rounded border p-2"><option>Alto</option><option>Bajo</option></select></label>
      <AppField v-model.number="form.duracion_min" label="Duración (min)" type="number" min="0" step="any" />
      <AppField v-model.number="form.temperatura_muestra" label="Temperatura de la muestra (°C)" type="number" step="any" />
      <AppField v-model="form.laboratorio" label="Laboratorio / equipo" />
      <AppField v-model="form.fecha_ensayo" label="Fecha del ensayo" type="date" />
      <AppField v-model="form.hora_ensayo" label="Hora de la lectura" type="time" />
    </div>
    <div class="grid gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-2"><AppField v-for="field in resultados" :key="field.key" v-model.number="form[field.key]" :label="field.label" type="number" min="0" step="any" /></div>
    <label class="block text-sm font-semibold">Nota / observaciones<textarea v-model="form.observaciones" rows="3" class="mt-1 block w-full rounded border p-2" /></label>
  </div>
</template>
