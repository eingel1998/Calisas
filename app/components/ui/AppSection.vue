<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <section class="space-y-3">
    <header>
      <h4 class="font-bold text-slate-900">{{ title }}</h4>
      <p v-if="description" class="mt-1 text-sm text-slate-600">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>
