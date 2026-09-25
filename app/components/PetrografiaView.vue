<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ samples: Array<{ id_muestra: string; coordenadas_muestreo?: string | null; direccion_muestreo?: string | null }>; apiBase: string }>()
const emit = defineEmits(['saved'])
const toast = useToast()
const id = ref('')
const datos = ref({ localizacion: '', unidad: '', coordenadas: '', tipo_muestra: '', aumento: '', escala: '', objetivo: '' })
const files = ref<File[]>([])
const condiciones = ref<string[]>([])
const imagenes = ref<Array<{ id: number; nombre: string; condicion: string }>>([])
const informe = ref('')
const estado = ref('borrador')
const modelo = ref('')
const busy = ref(false)
const api = () => `${props.apiBase}/historial/${encodeURIComponent(id.value)}/petrografia`

watch(id, async (actual) => {
  informe.value = ''
  estado.value = 'borrador'
  modelo.value = ''
  files.value = []
  condiciones.value = []
  imagenes.value = []
  datos.value = { localizacion: '', unidad: '', coordenadas: '', tipo_muestra: '', aumento: '', escala: '', objetivo: '' }
  if (!actual) return
  try {
    const saved: any = await $fetch(api())
    informe.value = saved.informe || ''
    estado.value = saved.estado || 'borrador'
    modelo.value = saved.modelo || ''
    datos.value = { ...datos.value, ...(saved.datos || {}) }
    imagenes.value = saved.imagenes || []
  } catch (e: any) { toast.add({ title: 'No se pudo cargar la petrografía', description: e.data?.statusMessage, color: 'error' }) }
})

function selectFiles(event: Event) {
  const chosen = Array.from((event.target as HTMLInputElement).files || [])
  if (chosen.length > 4 || chosen.some(f => f.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) {
    toast.add({ title: 'Selecciona hasta 4 imágenes JPEG, PNG o WEBP de máximo 8 MiB cada una', color: 'error' })
    return
  }
  files.value = chosen
  condiciones.value = chosen.map(() => 'Desconocida')
}
function payload(includeReport = false) {
  const form = new FormData()
  form.append('datos', JSON.stringify(datos.value))
  files.value.forEach((file, i) => { form.append('imagen', file); form.append(`condicion_${i}`, condiciones.value[i] || 'Desconocida') })
  if (includeReport) {
    form.append('informe', informe.value)
    form.append('estado', estado.value)
    form.append('modelo', modelo.value)
  }
  return form
}
async function analizar() {
  if (!id.value || !files.value.length) return
  busy.value = true
  try {
    const result: any = await $fetch(`${api()}/analizar`, { method: 'POST', body: payload() })
    informe.value = result.informe
    modelo.value = result.modelo
    estado.value = 'borrador'
    toast.add({ title: 'Borrador generado', description: 'Revisa y corrige el informe antes de guardarlo.', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo analizar', description: e.data?.statusMessage || 'Revisa las imágenes y la configuración del servidor.', color: 'error' }) }
  finally { busy.value = false }
}
async function guardar() {
  if (!id.value || !informe.value.trim()) return
  busy.value = true
  try {
    await $fetch(api(), { method: 'PUT', body: payload(true) })
    const saved: any = await $fetch(api())
    imagenes.value = saved.imagenes || []
    files.value = []
    condiciones.value = []
    emit('saved')
    toast.add({ title: 'Petrografía guardada', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo guardar', description: e.data?.statusMessage, color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <div><h2 class="text-2xl font-bold">Análisis petrográfico</h2><p class="text-sm text-slate-600">Las observaciones del modelo son un borrador. Revisa la evidencia antes de marcar el informe como revisado. Si la muestra aún no existe, regístrala en Evaluación geoquímica → FRX manual; los valores químicos pueden quedar vacíos.</p></div>
    <UCard><div class="space-y-4">
      <label class="block text-sm font-semibold">Muestra registrada
        <select v-model="id" class="mt-1 block w-full rounded-md border border-slate-300 p-2"><option value="">Selecciona una muestra</option><option v-for="sample in samples" :key="sample.id_muestra" :value="sample.id_muestra">{{ sample.id_muestra }}</option></select>
      </label>
      <div v-if="id" class="space-y-4">
        <p class="text-sm text-slate-600">Coordenadas: {{ samples.find(s => s.id_muestra === id)?.coordenadas_muestreo || 'Sin dato' }} · Dirección específica: {{ samples.find(s => s.id_muestra === id)?.direccion_muestreo || 'Sin dato' }}. Estos datos se editan desde el detalle de la muestra.</p>
        <div class="grid gap-3 md:grid-cols-2"><AppField v-model="datos.unidad" label="Unidad o formación geológica" /><AppField v-model="datos.tipo_muestra" label="Tipo de muestra" /><AppField v-model="datos.aumento" label="Aumento microscópico" /><AppField v-model="datos.escala" label="Escala" /><AppField v-model="datos.objetivo" label="Objetivo del estudio" /></div>
        <label class="block text-sm font-semibold">Fotografías de secciones delgadas (1 a 4)
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="mt-1 block" @change="selectFiles" />
        </label>
        <div v-for="(file, i) in files" :key="i" class="flex items-center gap-3 text-sm"><span class="truncate">{{ file.name }}</span><select v-model="condiciones[i]" :aria-label="`Condición óptica de ${file.name}`" class="rounded border p-1"><option>Desconocida</option><option>LP/PPL</option><option>NX/XPL</option></select></div>
        <div v-if="imagenes.length" class="flex flex-wrap gap-4"><a v-for="image in imagenes" :key="image.id" :href="`${api()}/${image.id}`" target="_blank" rel="noopener" class="text-sm text-emerald-700 underline">{{ image.nombre }} · {{ image.condicion }}</a></div>
        <UButton :loading="busy" :disabled="!files.length" color="success" @click="analizar">Generar borrador con IA</UButton>
      </div>
    </div></UCard>
    <UCard v-if="id && informe"><div class="space-y-3"><label class="block text-sm font-semibold" for="informe-petrografico">Informe editable</label><textarea id="informe-petrografico" v-model="informe" rows="22" class="w-full rounded-md border border-slate-300 p-3 font-mono text-sm" /><div class="flex flex-wrap items-center gap-3"><select v-model="estado" aria-label="Estado del informe" class="rounded border p-2"><option value="borrador">Borrador</option><option value="revisado">Revisado por especialista</option></select><UButton :loading="busy" color="success" @click="guardar">Guardar informe</UButton></div><p class="text-xs text-slate-500">Modelo: {{ modelo || 'Sin análisis automático' }}. La clasificación y las estimaciones visuales requieren validación petrográfica.</p></div></UCard>
  </div>
</template>
