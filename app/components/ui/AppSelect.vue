<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const modelValue = defineModel<string | number | null>('modelValue', { default: null })
defineProps<{ label: string; items: unknown[]; help?: string }>()
</script>

<template>
  <label class="block text-sm font-semibold text-slate-700">
    <span>{{ label }}</span>
    <USelect v-model="modelValue" :items="items" class="mt-1.5 w-full" v-bind="$attrs" />
    <span v-if="help" class="mt-1 block text-xs font-normal text-slate-500">{{ help }}</span>
  </label>
</template>
