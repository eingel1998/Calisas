<script setup lang="ts">
const subTab = defineModel<string>('subTab', { default: 'pdf' })
</script>

<template>
  <div class="space-y-6">
    <nav aria-label="Tipo de análisis geoquímico" class="flex gap-4 overflow-x-auto border-b border-slate-200 pb-px">
      <button v-for="tab in [{ id: 'pdf', label: '📄 FRX por PDF' }, { id: 'manual', label: '✍️ FRX manual' }, { id: 'batch', label: '📑 Carga por lote' }, { id: 'drx', label: '🧪 DRX' }]" :key="tab.id" :aria-current="subTab === tab.id ? 'page' : undefined" class="shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors" :class="subTab === tab.id ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'" @click="subTab = tab.id">
        {{ tab.label }}
      </button>
    </nav>
    <p class="text-sm text-slate-600">{{ { pdf: 'Carga un informe FRX en PDF, revisa los datos extraídos y registra la muestra.', manual: 'Ingresa los resultados químicos de una muestra sin subir un archivo.', batch: 'Carga varias muestras desde un archivo Excel o CSV.', drx: 'Registra las fases minerales medidas por difracción de rayos X.' }[subTab] }}</p>
    <slot name="context" />
    <div v-show="subTab === 'pdf'"><slot name="pdf" /></div>
    <div v-show="subTab === 'manual'"><slot name="manual" /></div>
    <div v-show="subTab === 'batch'"><slot name="batch" /></div>
    <div v-show="subTab === 'drx'"><slot name="drx" /></div>
  </div>
</template>
