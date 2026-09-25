<script setup lang="ts">
const subTab = defineModel<string>('subTab', { default: 'pdf' })
</script>

<template>
  <div class="space-y-6">
    <div class="flex gap-4 border-b border-slate-200 pb-px">
      <button v-for="tab in [{ id: 'pdf', label: '📄 Procesar PDF' }, { id: 'manual', label: '✍️ Entrada Manual' }, { id: 'batch', label: '📑 Carga por Lote' }]" :key="tab.id" class="border-b-2 px-1 pb-3 text-sm font-semibold transition-colors" :class="subTab === tab.id ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'" @click="subTab = tab.id">
        {{ tab.label }}
      </button>
    </div>
    <slot name="context" />
    <slot :name="subTab" />
  </div>
</template>
