<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
defineProps<{ sample?: { id_muestra?: string; fecha_registro?: string } | null }>()
</script>

<template>
  <USlideover v-model:open="open" title="Detalle de Muestra" :ui="{ content: 'w-full sm:max-w-4xl' }">
    <template #content>
      <div class="flex h-full flex-col bg-white">
        <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
          <div class="flex items-center gap-3"><span class="text-3xl">🪨</span><div><h3 class="text-lg font-bold text-slate-900">Muestra: {{ sample?.id_muestra }}</h3><p class="text-xs text-slate-400">Registrado el: {{ sample?.fecha_registro }}</p></div></div>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" aria-label="Cerrar detalle" @click="open = false" />
        </header>
        <div class="flex-1 overflow-y-auto p-6"><slot /></div>
      </div>
    </template>
  </USlideover>
</template>
