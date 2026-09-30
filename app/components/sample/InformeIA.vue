<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{ sampleId?: string; apiBase: string; alcance?: string; titulo?: string; descripcion?: string; compacto?: boolean }>(), { alcance: 'integral', titulo: 'Informe integral' })
const emit = defineEmits(['saved'])
const toast = useToast()
const informe = ref('')
const guardado = ref('')
const estado = ref('borrador')
const modelo = ref('')
const editando = ref(false)
const abierto = ref(!props.compacto)
const generando = ref(false)
const guardando = ref(false)
const borrando = ref(false)
const confirmar = ref<null | 'regenerar' | 'borrar'>(null)
const api = () => `${props.apiBase}/historial/${encodeURIComponent(props.sampleId || '')}/informe`

// ponytail: cada instancia pide sus informes; son pocos y livianos. Compartir la carga si el detalle crece.
watch(() => props.sampleId, async id => {
  informe.value = guardado.value = modelo.value = ''
  estado.value = 'borrador'
  editando.value = false
  if (!id) return
  try {
    const r = (await $fetch<Record<string, any>>(api()))[props.alcance]
    if (id !== props.sampleId || !r) return
    informe.value = guardado.value = r.informe
    estado.value = r.estado
    modelo.value = r.modelo || ''
  } catch { /* sin informe todavía */ }
}, { immediate: true })

async function generar() {
  generando.value = true
  abierto.value = true
  try {
    const res: any = await $fetch(api(), { method: 'POST', body: { alcance: props.alcance } })
    informe.value = guardado.value = res.informe
    estado.value = res.estado
    modelo.value = res.modelo
    emit('saved')
    toast.add({ title: `${props.titulo} generado`, description: res.aviso || (res.web ? 'Incluye búsqueda web con fuentes. Es un borrador: revísalo.' : 'Es un borrador: revísalo antes de marcarlo como revisado.'), color: res.aviso ? 'warning' : 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo generar el informe', description: e.data?.statusMessage, color: 'error' }) }
  finally { generando.value = false }
}

// Copia con formato (se pega bien en Word o Docs) y como texto plano de respaldo.
async function copiar() {
  const texto = limpiarLatex(informe.value)
  try {
    if (typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([informeHtml(informe.value)], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })])
    } else await navigator.clipboard.writeText(texto)
    toast.add({ title: 'Informe copiado', description: 'Pégalo en Word, Docs o un correo.', color: 'success' })
  } catch { toast.add({ title: 'No se pudo copiar', description: 'El navegador bloqueó el portapapeles.', color: 'error' }) }
}

async function borrar() {
  borrando.value = true
  try {
    await $fetch(api(), { method: 'DELETE', query: { alcance: props.alcance } })
    informe.value = guardado.value = modelo.value = ''
    estado.value = 'borrador'
    editando.value = false
    emit('saved')
    toast.add({ title: 'Informe borrado', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo borrar', description: e.data?.statusMessage, color: 'error' }) }
  finally { borrando.value = false }
}

function confirmado() {
  const accion = confirmar.value
  confirmar.value = null
  if (accion === 'regenerar') generar()
  else if (accion === 'borrar') borrar()
}

async function guardar() {
  guardando.value = true
  try {
    await $fetch(api(), { method: 'PUT', body: { alcance: props.alcance, informe: informe.value, estado: estado.value } })
    guardado.value = informe.value
    editando.value = false
    emit('saved')
    toast.add({ title: 'Informe guardado', color: 'success' })
  } catch (e: any) { toast.add({ title: 'No se pudo guardar', description: e.data?.statusMessage, color: 'error' }) }
  finally { guardando.value = false }
}
</script>

<template>
  <div class="space-y-3" :class="compacto ? '' : 'rounded-xl border bg-white p-4'">
    <div class="flex flex-wrap items-center gap-2">
      <p v-if="!compacto" class="mr-auto font-bold">{{ titulo }}</p>
      <UButton v-if="!informe" size="sm" color="success" icon="i-heroicons-sparkles" :loading="generando" @click="generar">Generar informe</UButton>
      <template v-else-if="!generando">
        <UBadge :color="estado === 'revisado' ? 'success' : 'warning'" variant="subtle">{{ estado === 'revisado' ? 'Revisado' : 'Borrador' }}</UBadge>
        <span v-if="modelo" class="text-xs text-slate-500">{{ modelo }}</span>
        <UButton v-if="compacto" size="sm" variant="ghost" :icon="abierto ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" @click="abierto = !abierto">{{ abierto ? 'Ocultar' : 'Ver' }}</UButton>
        <UButton size="sm" variant="ghost" icon="i-heroicons-clipboard-document" @click="copiar">Copiar</UButton>
        <UButton v-if="!editando" size="sm" variant="ghost" icon="i-heroicons-pencil-square" @click="editando = true; abierto = true">Editar</UButton>
        <UButton size="sm" variant="ghost" icon="i-heroicons-arrow-path" @click="confirmar = 'regenerar'">Regenerar</UButton>
        <UButton size="sm" variant="ghost" color="error" icon="i-heroicons-trash" :loading="borrando" :aria-label="`Borrar ${titulo}`" @click="confirmar = 'borrar'" />
      </template>
    </div>
    <p v-if="generando" role="status" class="flex items-center gap-2 text-sm text-slate-600"><UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />Generando {{ titulo.toLowerCase() }}… puede tardar 1–3 minutos.</p>
    <p v-else-if="!informe && descripcion" class="text-sm text-slate-500">{{ descripcion }}</p>
    <template v-if="informe && abierto && !generando">
      <div v-if="editando" class="space-y-2">
        <textarea v-model="informe" rows="24" class="w-full rounded-md border border-slate-300 p-3 font-mono text-xs" />
        <div class="flex flex-wrap items-center gap-2">
          <select v-model="estado" aria-label="Estado del informe" class="rounded border p-2 text-sm"><option value="borrador">Borrador</option><option value="revisado">Revisado por especialista</option></select>
          <UButton color="success" :loading="guardando" @click="guardar">Guardar</UButton>
          <UButton variant="ghost" @click="editando = false; informe = guardado">Cancelar</UButton>
        </div>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -- saneado con DOMPurify en informeHtml -->
      <article v-else class="informe-md max-h-[70vh] overflow-y-auto rounded-lg border bg-white p-5" v-html="informeHtml(informe)" />
    </template>
    <UModal :open="Boolean(confirmar)" @update:open="v => { if (!v) confirmar = null }">
      <template #content>
        <div class="space-y-4 p-6">
          <h3 class="text-lg font-bold">{{ confirmar === 'borrar' ? `¿Borrar ${titulo.toLowerCase()}?` : `¿Regenerar ${titulo.toLowerCase()}?` }}</h3>
          <p class="text-sm text-slate-600">
            {{ confirmar === 'borrar' ? 'Se elimina el texto del informe; los datos de laboratorio de la muestra no se tocan.' : 'El modelo escribe un informe nuevo y reemplaza el actual.' }}
            <b v-if="estado === 'revisado'" class="text-amber-700">Este informe está marcado como revisado por un especialista; sus correcciones se perderán.</b>
          </p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="confirmar = null">Cancelar</UButton>
            <UButton :color="confirmar === 'borrar' ? 'error' : 'success'" @click="confirmado">{{ confirmar === 'borrar' ? 'Borrar' : 'Regenerar' }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
