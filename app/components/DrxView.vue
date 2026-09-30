<script setup lang="ts">
import { ref, watch } from 'vue'
import { imagen_a_png, pdf_a_png } from '~/utils/pdf-imagen'

// Bloque DRX del panel de carga/edición: la fuente son una o varias gráficas (difractogramas) del laboratorio.
// `nuevo`: la muestra aún no existe, no hay nada que cargar.
const MAX = 8
const props = defineProps<{ apiBase: string; sampleId?: string; nuevo?: boolean }>()
const toast = useToast()
const nuevas = ref<Array<{ original: File; png: File; vista: string }>>([])
const guardadas = ref<Array<{ id: number; nombre: string; original_mime: string | null }>>([])
const convirtiendo = ref(false)
const base = (id: string) => `${props.apiBase}/historial/${encodeURIComponent(id)}/drx/graficas`

function quitar(i: number) {
  URL.revokeObjectURL(nuevas.value[i].vista)
  nuevas.value.splice(i, 1)
}
function limpiar() {
  nuevas.value.forEach(n => URL.revokeObjectURL(n.vista))
  nuevas.value = []
}

watch(() => props.sampleId, async id => {
  if (props.nuevo || !id) return
  try { guardadas.value = await $fetch(base(id)) }
  catch (e: any) { toast.add({ title: 'No se pudieron cargar las gráficas DRX', description: e.data?.statusMessage, color: 'error' }) }
}, { immediate: true })

async function elegir(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  if (nuevas.value.length + files.length > MAX) return toast.add({ title: `Máximo ${MAX} gráficas DRX`, color: 'error' })
  convirtiendo.value = true
  try {
    for (const file of files) {
      const esPdf = file.name.toLowerCase().endsWith('.pdf')
      if ((!esPdf && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) || file.size > 10 * 1024 * 1024) {
        toast.add({ title: `${file.name}: sube PDF, PNG, JPG o WEBP de hasta 10 MiB`, color: 'error' })
        continue
      }
      const png = esPdf ? await pdf_a_png(file) : await imagen_a_png(file)
      nuevas.value.push({ original: file, png, vista: URL.createObjectURL(png) })
    }
  } catch { toast.add({ title: 'No se pudo leer uno de los archivos', color: 'error' }) }
  finally { convirtiendo.value = false }
}

// Las gráficas se guardan como conjunto: subir nuevas reemplaza las anteriores. Los errores suben al panel.
async function save(id: string) {
  if (!nuevas.value.length) return
  const body = new FormData()
  nuevas.value.forEach((n, i) => {
    body.append(`png_${i}`, n.png)
    body.append(`original_${i}`, n.original)
    body.append(`nombre_${i}`, n.original.name)
  })
  await $fetch(base(id), { method: 'POST', body })
  limpiar()
}
defineExpose({ save, tieneGrafica: () => Boolean(nuevas.value.length || guardadas.value.length) })
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-slate-500">Sube una o varias gráficas del difractograma (con sus fases identificadas) tal como las entrega el laboratorio. El modelo las interpreta al generar los informes.</p>
    <label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-emerald-500" :class="nuevas.length ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'">
      <input type="file" multiple accept=".pdf,application/pdf,image/png,image/jpeg,image/webp" class="sr-only" :disabled="convirtiendo" @change="elegir">
      <UIcon :name="convirtiendo ? 'i-lucide-loader-2' : 'i-heroicons-chart-bar'" class="size-7 shrink-0" :class="[convirtiendo && 'animate-spin', nuevas.length ? 'text-emerald-600' : 'text-slate-400']" />
      <span><span class="block text-sm font-semibold">{{ nuevas.length ? 'Agregar más gráficas' : guardadas.length ? 'Reemplazar gráficas DRX' : 'Gráficas DRX' }}</span><span class="block text-xs text-slate-500">{{ convirtiendo ? 'Procesando…' : `PDF o imagen (PNG, JPG, WEBP) · hasta ${MAX}` }}</span></span>
    </label>
    <div v-if="nuevas.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div v-for="(n, i) in nuevas" :key="n.vista" class="relative overflow-hidden rounded-lg border">
        <img :src="n.vista" :alt="n.original.name" class="h-40 w-full bg-white object-contain">
        <p class="truncate border-t px-2 py-1 text-xs">{{ n.original.name }}</p>
        <UButton size="xs" color="error" variant="solid" icon="i-heroicons-x-mark" class="absolute right-1 top-1" :aria-label="`Quitar ${n.original.name}`" @click="quitar(i)" />
      </div>
    </div>
    <template v-else-if="guardadas.length && sampleId">
      <p class="text-xs text-slate-500">{{ guardadas.length }} {{ guardadas.length === 1 ? 'gráfica guardada' : 'gráficas guardadas' }}. Si subes nuevas, reemplazan a estas.</p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <a v-for="g in guardadas" :key="g.id" :href="`${base(sampleId)}/${g.id}`" target="_blank" rel="noopener" class="overflow-hidden rounded-lg border"><img :src="`${base(sampleId)}/${g.id}`" :alt="g.nombre" class="h-40 w-full bg-white object-contain" loading="lazy"><p class="truncate border-t px-2 py-1 text-xs">{{ g.nombre }}</p></a>
      </div>
    </template>
  </div>
</template>
