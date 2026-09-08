<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
    <div class="p-6 bg-primary/10 text-primary rounded-full border border-primary/20">
      <UIcon :name="icon" class="w-16 h-16" />
    </div>
    <h2 class="text-2xl font-bold text-default">{{ title }}</h2>
    <p class="text-sm text-muted">Próximamente — análisis experimental</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true }
})
</script>