<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ samples: Array<{ id_muestra: string; coordenadas_muestreo?: string | null; direccion_muestreo?: string | null }>; apiBase: string }>()
const emit = defineEmits(['saved', 'register-sample'])
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
const loadingSample = ref(false)
const loadError = ref('')
const savedSnapshot = ref('')
const pendingSample = ref('')
const confirmDiscard = ref(false)
const snapshot = () => JSON.stringify({ datos: datos.value, informe: informe.value, estado: estado.value })
const hasChanges = computed(() => !!files.value.length || (!!id.value && !!savedSnapshot.value && snapshot() !== savedSnapshot.value))
const api = () => `${props.apiBase}/historial/${encodeURIComponent(id.value)}/petrografia`

function requestSample(event: Event) {
  const select = event.target as HTMLSelectElement
  const next = select.value
  select.value = id.value
  if (next === id.value) return
  if (hasChanges.value) {
    pendingSample.value = next
    confirmDiscard.value = true
  } else id.value = next
}

function discardAndSwitch() {
  id.value = pendingSample.value
  pendingSample.value = ''
  confirmDiscard.value = false
}

async function loadSaved(sampleId: string) {
  loadingSample.value = true
  loadError.value = ''
  try {
    const saved: any = await $fetch(`${props.apiBase}/historial/${encodeURIComponent(sampleId)}/petrografia`)
    if (id.value !== sampleId) return
    informe.value = saved.informe || ''
    estado.value = saved.estado || 'borrador'
    modelo.value = saved.modelo || ''
    datos.value = { ...datos.value, ...(saved.datos || {}) }
    imagenes.value = saved.imagenes || []
    savedSnapshot.value = snapshot()
  } catch (e: any) {
    if (id.value === sampleId) loadError.value = e.data?.statusMessage || 'Revisa tu conexión e intenta de nuevo.'
  } finally {
    if (id.value === sampleId) loadingSample.value = false
  }
}

watch(id, (actual) => {
  informe.value = ''
  estado.value = 'borrador'
  modelo.value = ''
  files.value = []
  condiciones.value = []
  imagenes.value = []
  datos.value = { localizacion: '', unidad: '', coordenadas: '', tipo_muestra: '', aumento: '', escala: '', objetivo: '' }
  loadError.value = ''
  savedSnapshot.value = ''
  if (actual) loadSaved(actual)
})

function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = Array.from(input.files || [])
  input.value = ''
  if (!chosen.length) return
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
  if (!id.value || (!informe.value.trim() && !files.value.length && !imagenes.value.length)) return
  if (!informe.value.trim()) estado.value = 'borrador'
  busy.value = true
  try {
    await $fetch(api(), { method: 'PUT', body: payload(true) })
    const saved: any = await $fetch(api())
    imagenes.value = saved.imagenes || []
    files.value = []
    condiciones.value = []
    savedSnapshot.value = snapshot()
    emit('saved')
    toast.add({ title: informe.value.trim() ? 'Petrografía guardada' : 'Fotografías guardadas', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo guardar', description: e.data?.statusMessage, color: 'error' }) }
  finally { busy.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <div><h2 class="text-2xl font-bold">Análisis petrográfico</h2><p class="text-sm text-slate-600">Las observaciones del modelo son un borrador. Revisa la evidencia antes de marcar el informe como revisado. Si la muestra aún no existe, regístrala en Evaluación geoquímica → FRX manual; los valores químicos pueden quedar vacíos.</p></div>
    <UCard v-if="!samples.length"><div class="space-y-3"><p class="text-sm text-slate-600">Para asociar fotografías, primero registra la muestra. Puedes dejar vacíos los valores químicos que no tienes.</p><UButton color="success" @click="emit('register-sample')">Registrar muestra</UButton></div></UCard>
    <UCard v-else><div class="space-y-4">
      <label class="block text-sm font-semibold">Muestra registrada
        <select :value="id" :disabled="busy" class="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" @change="requestSample"><option value="">Selecciona una muestra</option><option v-for="sample in samples" :key="sample.id_muestra" :value="sample.id_muestra">{{ sample.id_muestra }}</option></select>
      </label>
      <p v-if="!id" class="text-sm text-slate-500">Selecciona una muestra para agregar las fotografías de sus secciones delgadas.</p>
      <p v-else-if="loadingSample" role="status" class="text-sm text-slate-600">Cargando fotografías e informe…</p>
      <div v-else-if="loadError" role="alert" class="space-y-2"><p class="text-sm text-rose-700">No se pudo cargar la muestra: {{ loadError }}</p><UButton variant="outline" @click="loadSaved(id)">Reintentar</UButton></div>
      <div v-else class="space-y-4">
        <p class="text-sm text-slate-600">Coordenadas: {{ samples.find(s => s.id_muestra === id)?.coordenadas_muestreo || 'Sin dato' }} · Dirección específica: {{ samples.find(s => s.id_muestra === id)?.direccion_muestreo || 'Sin dato' }}. Estos datos se editan desde el detalle de la muestra.</p>
        <div class="grid gap-3 md:grid-cols-2"><AppField v-model="datos.unidad" label="Unidad o formación geológica" /><AppField v-model="datos.tipo_muestra" label="Tipo de muestra" /><AppField v-model="datos.aumento" label="Aumento microscópico" /><AppField v-model="datos.escala" label="Escala" /><AppField v-model="datos.objetivo" label="Objetivo del estudio" /></div>
        <div>
          <p class="mb-2 text-sm font-semibold">Fotografías de secciones delgadas</p>
          <input id="fotos-secciones-delgadas" type="file" accept="image/jpeg,image/png,image/webp" multiple class="peer sr-only" @change="selectFiles" />
          <label for="fotos-secciones-delgadas" class="inline-flex cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600">
            <UIcon name="i-heroicons-photo" class="size-5" /> Agregar fotografías
          </label>
          <p class="mt-2 text-xs text-slate-500">Selecciona de 1 a 4 imágenes JPEG, PNG o WEBP, hasta 8 MiB cada una.</p>
          <p v-if="files.length" class="mt-2 text-sm font-medium text-emerald-700">{{ files.length }} {{ files.length === 1 ? 'fotografía seleccionada' : 'fotografías seleccionadas' }}</p>
        </div>
        <div v-for="(file, i) in files" :key="i" class="flex items-center gap-3 text-sm"><span class="truncate">{{ file.name }}</span><select v-model="condiciones[i]" :aria-label="`Condición óptica de ${file.name}`" class="rounded border p-1"><option>Desconocida</option><option>LP/PPL</option><option>NX/XPL</option></select></div>
        <div v-if="imagenes.length" class="flex flex-wrap gap-4"><a v-for="image in imagenes" :key="image.id" :href="`${api()}/${image.id}`" target="_blank" rel="noopener" class="text-sm text-emerald-700 underline">{{ image.nombre }} · {{ image.condicion }}</a></div>
        <UButton :loading="busy" :disabled="!files.length" color="success" @click="analizar">Generar borrador con IA</UButton>
        <p class="text-xs text-slate-500">La IA es opcional. Puedes guardar las fotografías directamente y escribir el informe después.</p>
      </div>
    </div></UCard>
    <UCard v-if="id && !loadingSample && !loadError"><div class="space-y-3"><label class="block text-sm font-semibold" for="informe-petrografico">Informe petrográfico (opcional)</label><textarea id="informe-petrografico" v-model="informe" rows="12" placeholder="Escribe tus observaciones o genera un borrador con IA" class="w-full rounded-md border border-slate-300 p-3 text-sm" /><div class="flex flex-wrap items-center gap-3"><select v-model="estado" aria-label="Estado del informe" :disabled="!informe.trim()" class="rounded border p-2"><option value="borrador">Borrador</option><option value="revisado">Revisado por especialista</option></select><UButton :loading="busy" :disabled="!informe.trim() && !files.length && !imagenes.length" color="success" @click="guardar">Guardar fotografías e informe</UButton></div><p class="text-xs text-slate-500">Modelo: {{ modelo || 'Sin análisis automático' }}. La clasificación y las estimaciones visuales requieren validación petrográfica.</p></div></UCard>
    <UModal v-model:open="confirmDiscard"><template #content><div class="space-y-4 rounded-lg bg-elevated p-6"><h3 class="text-lg font-bold">Cambios sin guardar</h3><p class="text-sm text-muted">Si cambias de muestra, perderás las fotografías y los cambios del informe que aún no has guardado.</p><div class="flex justify-end gap-3"><UButton color="neutral" variant="ghost" @click="confirmDiscard = false">Seguir editando</UButton><UButton color="error" @click="discardAndSwitch">Descartar cambios</UButton></div></div></template></UModal>
  </div>
</template>
