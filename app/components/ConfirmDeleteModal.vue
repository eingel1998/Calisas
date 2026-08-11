<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4 bg-elevated rounded-lg">
        <h3 class="font-bold text-lg text-default">¿Estás seguro de eliminar esta muestra?</h3>
        <p class="text-sm text-muted">Esta acción es irreversible y eliminará de forma permanente el registro "{{ sampleId }}" de la base de datos SQLite.</p>
        <div class="flex justify-end gap-3 pt-2">
          <UButton color="neutral" variant="ghost" @click="open = false">Cancelar</UButton>
          <UButton color="error" :loading="loading" @click="emit('confirm')">Eliminar Permanentemente</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const open = defineModel('open', { type: Boolean, default: false })
const props = defineProps({
  sampleId: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['confirm'])
</script>