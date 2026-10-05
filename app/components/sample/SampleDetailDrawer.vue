<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ sample?: any }>()
const emit = defineEmits(['edit'])

// Atrás del navegador/Android cierra el detalle en vez de salir de la vista.
const STATE_KEY = 'sampleDetail'
const onPopState = () => { open.value = false }

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    history.pushState({ ...history.state, [STATE_KEY]: true }, '')
    window.addEventListener('popstate', onPopState)
  } else {
    window.removeEventListener('popstate', onPopState)
    if (history.state?.[STATE_KEY]) history.back()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', onPopState)
  if (open.value && history.state?.[STATE_KEY]) history.back()
})
</script>

<template>
  <!-- Teléfono: pantalla completa con Volver. Tablet y escritorio: panel lateral sobre la lista. -->
  <USlideover v-model:open="open" title="Detalle de muestra" :ui="{ content: 'w-full max-w-none md:max-w-2xl lg:max-w-4xl' }">
    <template #content>
      <div class="flex h-dvh flex-col bg-white md:h-full">
        <header class="border-b bg-slate-50 px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-6 md:py-5">
          <div class="flex items-start justify-between gap-2 md:gap-4">
            <UButton class="md:hidden" color="neutral" variant="ghost" size="lg" icon="i-heroicons-arrow-left" aria-label="Volver" @click="open = false" />
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-lg font-bold text-slate-900 md:text-xl">{{ sample?.id_muestra }}</h3>
              <p class="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-600"><UIcon name="i-heroicons-map-pin" class="size-4 shrink-0 text-slate-400" /><span class="truncate">{{ sample?.direccion_muestreo || sample?.coordenadas_muestreo || 'Sin ubicación registrada' }}</span></p>
              <p class="mt-0.5 text-xs text-slate-500">Registrada el {{ fecha(sample?.fecha_registro) }}<template v-if="sample?.fecha_modificacion"> · editada el {{ fecha(sample.fecha_modificacion) }}</template></p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UButton color="success" icon="i-heroicons-pencil-square" :aria-label="`Editar muestra ${sample?.id_muestra || ''}`" @click="emit('edit')"><span class="hidden sm:inline">Editar muestra</span><span class="sm:hidden">Editar</span></UButton>
              <UButton class="hidden md:inline-flex" color="neutral" variant="ghost" icon="i-heroicons-x-mark" aria-label="Cerrar detalle" @click="open = false" />
            </div>
          </div>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6"><slot /></div>
      </div>
    </template>
  </USlideover>
</template>
