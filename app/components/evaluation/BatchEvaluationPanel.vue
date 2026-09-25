<script setup lang="ts">
defineProps<{ fileName: string; hasFile: boolean; loading: boolean }>()
defineEmits(['select-file', 'submit'])
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <UCard class="shadow-sm">
      <template #header><div class="flex items-center gap-2"><UIcon name="i-heroicons-table-cells" class="h-5 w-5 text-emerald-500" /><h3 class="font-bold text-slate-800">Cargar Archivo por Lote (Excel / CSV)</h3></div></template>
      <div class="space-y-4">
        <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><p class="font-semibold text-slate-800">Columnas recomendadas en el archivo:</p><p class="block rounded border border-slate-200 bg-white p-2 font-mono text-xs">ID Muestra, CaCO₃, CaO, MgO, SiO₂, Fe₂O₃, Al₂O₃, SO₃, Na₂O, K₂O</p><p>La aplicación validará todas las filas y guardará sus evaluaciones con la base seleccionada. Los campos ausentes permanecerán sin dato.</p></div>
        <div class="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:border-emerald-500"><input type="file" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="$emit('select-file', $event)"><UIcon name="i-heroicons-document-text" class="mb-2 h-12 w-12 text-slate-400" /><p class="text-sm font-semibold text-slate-700">Arrastra o selecciona tu Excel/CSV</p><p class="mt-1 text-xs text-slate-500">Soporta formatos .xlsx y .csv</p></div>
        <div v-if="fileName" class="flex items-center justify-between rounded-lg bg-slate-100 p-3 text-sm"><div class="flex items-center gap-2 truncate"><UIcon name="i-heroicons-document-check" class="h-5 w-5 shrink-0 text-emerald-500" /><span class="truncate font-medium text-slate-700">{{ fileName }}</span></div></div>
        <div class="flex justify-end pt-4"><UButton color="success" :loading="loading" :disabled="!hasFile" @click="$emit('submit')">Procesar y Guardar Lote</UButton></div>
      </div>
    </UCard>
  </div>
</template>
