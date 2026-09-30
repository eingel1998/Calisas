<script setup lang="ts">
import { ref, watch } from 'vue'

// Bloque de petrografía del panel de carga/edición: la fuente son las fotos de secciones delgadas.
// El informe lo genera la IA desde el detalle de la muestra; aquí solo se conserva al guardar.
const props = defineProps<{ apiBase: string; sampleId?: string; nuevo?: boolean }>()
const toast = useToast()
const datos = ref({ localizacion: '', unidad: '', coordenadas: '', tipo_muestra: '', aumento: '', escala: '', objetivo: '' })
const files = ref<File[]>([])
const vistas = ref<string[]>([])
const condiciones = ref<string[]>([])
const imagenes = ref<Array<{ id: number; nombre: string; condicion: string }>>([])
const informe = ref({ texto: '', estado: 'borrador', modelo: '' })
const cargando = ref(false)
const errorCarga = ref('')
const api = (id: string) => `${props.apiBase}/historial/${encodeURIComponent(id)}/petrografia`

async function cargar(id: string) {
  cargando.value = true
  errorCarga.value = ''
  try {
    const saved: any = await $fetch(api(id))
    informe.value = { texto: saved.informe || '', estado: saved.estado || 'borrador', modelo: saved.modelo || '' }
    datos.value = { ...datos.value, ...(saved.datos || {}) }
    imagenes.value = saved.imagenes || []
  } catch (e: any) { errorCarga.value = e.data?.statusMessage || 'Revisa tu conexión e intenta de nuevo.' }
  finally { cargando.value = false }
}
watch(() => props.sampleId, id => { if (!props.nuevo && id) cargar(id) }, { immediate: true })

function limpiarVistas() {
  vistas.value.forEach(URL.revokeObjectURL)
  vistas.value = []
}
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = Array.from(input.files || [])
  input.value = ''
  if (!chosen.length) return
  if (chosen.length > 4 || chosen.some(f => f.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) {
    toast.add({ title: 'Selecciona hasta 4 imágenes JPEG, PNG o WEBP de máximo 8 MiB cada una', color: 'error' })
    return
  }
  limpiarVistas()
  files.value = chosen
  vistas.value = chosen.map(f => URL.createObjectURL(f))
  condiciones.value = chosen.map(() => 'Desconocida')
}

// Sin fotos no hay petrografía. Los errores suben al panel, que los resume.
async function save(id: string) {
  if (!files.value.length && !imagenes.value.length) return
  const form = new FormData()
  form.append('datos', JSON.stringify(datos.value))
  files.value.forEach((file, i) => { form.append('imagen', file); form.append(`condicion_${i}`, condiciones.value[i] || 'Desconocida') })
  form.append('informe', informe.value.texto)
  form.append('estado', informe.value.texto ? informe.value.estado : 'borrador')
  form.append('modelo', informe.value.modelo)
  await $fetch(api(id), { method: 'PUT', body: form })
  files.value = []
  condiciones.value = []
  limpiarVistas()
}
defineExpose({ save, tieneFotos: () => Boolean(files.value.length || imagenes.value.length) })
</script>

<template>
  <div class="space-y-4">
    <p v-if="cargando" role="status" class="text-sm text-slate-600">Cargando fotografías…</p>
    <div v-else-if="errorCarga" role="alert" class="space-y-2"><p class="text-sm text-rose-700">No se pudo cargar la petrografía: {{ errorCarga }}</p><UButton variant="outline" @click="sampleId && cargar(sampleId)">Reintentar</UButton></div>
    <template v-else>
      <p class="text-sm text-slate-500">Sube las fotografías de las secciones delgadas e indica si cada una es en luz paralela (LP) o nícoles cruzados (NX). El informe petrográfico se genera con IA desde el detalle de la muestra.</p>
      <label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-emerald-500" :class="files.length ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" @change="selectFiles">
        <UIcon :name="files.length ? 'i-heroicons-check-circle' : 'i-heroicons-photo'" class="size-7 shrink-0" :class="files.length ? 'text-emerald-600' : 'text-slate-400'" />
        <span><span class="block text-sm font-semibold">{{ imagenes.length ? 'Reemplazar fotografías' : 'Fotografías de secciones delgadas' }}</span><span class="block text-xs text-slate-500">{{ files.length ? `${files.length} seleccionadas` : '1 a 4 imágenes JPEG, PNG o WEBP · máx. 8 MiB c/u' }}</span></span>
      </label>
      <div v-if="files.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="(file, i) in files" :key="i" class="overflow-hidden rounded-lg border">
          <img :src="vistas[i]" :alt="file.name" class="aspect-square w-full object-cover">
          <select v-model="condiciones[i]" :aria-label="`Condición óptica de ${file.name}`" class="w-full border-t p-1.5 text-xs"><option>Desconocida</option><option value="LP/PPL">LP · luz paralela</option><option value="NX/XPL">NX · nícoles cruzados</option></select>
        </div>
      </div>
      <div v-else-if="imagenes.length && sampleId" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <a v-for="img in imagenes" :key="img.id" :href="`${api(sampleId)}/${img.id}`" target="_blank" rel="noopener" class="overflow-hidden rounded-lg border"><img :src="`${api(sampleId)}/${img.id}`" :alt="img.nombre" class="aspect-square w-full object-cover" loading="lazy"><p class="truncate px-2 py-1 text-xs">{{ img.condicion }}</p></a>
      </div>
      <details class="rounded-lg border p-3 text-sm">
        <summary class="cursor-pointer font-medium">Datos del estudio (opcional: mejoran el informe)</summary>
        <div class="mt-3 grid gap-3 md:grid-cols-2"><AppField v-model="datos.unidad" label="Unidad o formación geológica" /><AppField v-model="datos.tipo_muestra" label="Tipo de muestra" /><AppField v-model="datos.aumento" label="Aumento / objetivo del microscopio" placeholder="Ej: 10x" /><AppField v-model="datos.escala" label="Escala (µm por división)" /><AppField v-model="datos.objetivo" label="Objetivo del estudio" /></div>
      </details>
    </template>
  </div>
</template>
