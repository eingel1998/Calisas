<template>
  <UModal v-model:open="open" @update:open="handleOpenChange">
    <template #content>
      <div class="p-6 space-y-6 bg-elevated rounded-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-table-cells" class="text-primary w-5 h-5" />
            <h3 class="font-bold text-lg text-default">Cargar Archivo por Lote (Excel / CSV)</h3>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="close" />
        </div>

        <div class="p-4 bg-muted border border-muted rounded-lg text-sm text-muted space-y-2">
          <p class="font-semibold text-default">Columnas recomendadas en el archivo:</p>
          <p class="font-mono text-xs bg-elevated border border-default p-2 rounded block">
            ID Muestra, CaCO3, CaO, MgO, SiO2, Fe2O3, Al2O3, SO3, Na2O, K2O
          </p>
          <p>La aplicación procesará cada fila, estimará LOI y módulos de clinker, y guardará todo automáticamente en la base de datos.</p>
        </div>

        <div class="border-2 border-dashed border-default rounded-lg p-8 hover:border-primary transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-muted">
          <input
            type="file"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".csv,.xlsx,.xls"
            @change="onFilePicked"
          />
          <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-dimmed mb-2" />
          <p class="text-sm font-semibold text-default">Arrastra o selecciona tu Excel/CSV</p>
          <p class="text-xs text-muted mt-1">Soporta formatos .xlsx, .xls, .csv</p>
        </div>

        <div v-if="file" class="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm">
          <UIcon name="i-heroicons-document-check" class="text-primary w-5 h-5 shrink-0" />
          <span class="truncate font-medium text-default">{{ file.name }}</span>
        </div>

        <div class="flex justify-end pt-2">
          <UButton color="primary" :loading="batchLoading" :disabled="!file" @click="process">
            Procesar y Guardar Lote
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
import { ref } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

defineProps({
  batchLoading: { type: Boolean, default: false }
})
const emit = defineEmits(['process', 'cancel'])

const file = ref(null)

function handleOpenChange(val) {
  if (val) {
    file.value = null
  } else {
    emit('cancel')
  }
}

function close() {
  open.value = false
  emit('cancel')
}

function onFilePicked(event) {
  const f = event.target.files[0]
  if (f) file.value = f
  event.target.value = ''
}

function process() {
  if (!file.value) return
  emit('process', file.value)
}
</script>