<script setup lang="ts">
defineProps<{
  originales?: Array<{ compuesto: string; texto: string; unidad: string }>
  chemicalText: (text: string) => string
}>()
</script>

<template>
  <AppSection :title="`Composición original completa · ${originales?.length || 0} componentes`" description="Valores guardados del informe. Los componentes sin criterio configurado se conservan, pero no generan un dictamen.">
    <AppTable label="Composición original completa">
      <template #head><tr><th class="px-4 py-3">Compuesto</th><th class="px-4 py-3">Lectura</th><th class="px-4 py-3">Unidad</th></tr></template>
      <tr v-for="(item, index) in originales || []" :key="index"><td class="px-4 py-3 font-medium">{{ chemicalText(item.compuesto) }}</td><td class="px-4 py-3">{{ item.texto }}</td><td class="px-4 py-3">{{ item.unidad }}</td></tr>
      <tr v-if="!originales?.length"><td colspan="3" class="px-4 py-6 text-center text-slate-500">Sin componentes extraídos.</td></tr>
    </AppTable>
  </AppSection>
</template>
