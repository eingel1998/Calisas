<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-slate-200">
    <table class="w-full min-w-max text-left text-sm" :aria-label="label">
      <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <slot name="head" />
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white text-slate-700">
        <slot />
      </tbody>
    </table>
  </div>
</template>
