<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ sample?: any }>()
const emit = defineEmits(['edit'])
</script>

<template>
  <USlideover v-model:open="open" title="Detalle de muestra" :ui="{ content: 'w-full sm:max-w-4xl' }">
    <template #content>
      <div class="flex h-full flex-col bg-white">
        <header class="border-b bg-slate-50 px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h3 class="text-xl font-bold text-slate-900">{{ sample?.id_muestra }}</h3>
              <p class="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-600"><UIcon name="i-heroicons-map-pin" class="size-4 shrink-0 text-slate-400" />{{ sample?.direccion_muestreo || sample?.coordenadas_muestreo || 'Sin ubicación registrada' }}</p>
              <p class="mt-0.5 text-xs text-slate-500">Registrada el {{ fecha(sample?.fecha_registro) }}<template v-if="sample?.fecha_modificacion"> · editada el {{ fecha(sample.fecha_modificacion) }}</template></p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UButton color="success" icon="i-heroicons-pencil-square" @click="emit('edit')">Editar muestra</UButton>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" aria-label="Cerrar detalle" @click="open = false" />
            </div>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto p-6"><slot /></div>
      </div>
    </template>
  </USlideover>
</template>
