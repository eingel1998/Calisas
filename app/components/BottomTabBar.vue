<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegación principal">
    <ul class="flex h-16 items-stretch">
      <li v-for="item in items" :key="item.id" class="flex flex-1">
        <button
          type="button"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          class="flex min-h-11 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-emerald-600"
          :class="activeTab === item.id ? 'text-emerald-700' : 'text-slate-600'"
          @click="emit('navigate', { tab: item.id })"
        >
          <span
            v-if="item.id === 'cargar'"
            class="grid h-8 w-12 place-items-center rounded-full text-white"
            :class="activeTab === item.id ? 'bg-emerald-700' : 'bg-emerald-600'"
          ><UIcon :name="item.icon" class="size-5" /></span>
          <UIcon v-else :name="item.icon" class="size-6" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ activeTab: string; canConfigure: boolean }>()
const emit = defineEmits(['navigate'])

const items = computed(() => [
  { id: 'dashboard', icon: 'i-heroicons-home', label: 'Inicio' },
  { id: 'cargar', icon: 'i-heroicons-plus', label: 'Cargar' },
  { id: 'historial', icon: 'i-heroicons-table-cells', label: 'Historial' },
  ...(props.canConfigure ? [{ id: 'configuracion', icon: 'i-heroicons-cog-6-tooth', label: 'Ajustes' }] : [])
])
</script>
