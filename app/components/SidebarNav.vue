<template>
  <!-- Rail en tablet (md), barra completa en escritorio (lg); en teléfono navega la barra inferior -->
  <aside class="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col justify-between overflow-y-auto bg-slate-900 text-white md:flex lg:w-72" aria-label="Navegación principal">
    <div>
      <div class="flex justify-center border-b border-slate-800 py-4 lg:justify-start lg:p-6">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="Calcita" class="size-9">
          <div class="hidden lg:block">
            <h1 class="font-bold text-lg tracking-tight leading-none text-slate-100">Calcita</h1>
            <span class="text-xs text-emerald-400 font-medium">Análisis de calizas</span>
          </div>
        </div>
      </div>

      <nav class="space-y-1.5 p-2 lg:p-4">
        <button
          v-for="item in navItems.filter(item => item.id !== 'configuracion' || canConfigure)"
          :key="item.id"
          type="button"
          :aria-current="activeTab === item.id ? 'page' : undefined"
          :class="[
            'flex w-full min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5 lg:text-sm',
            activeTab === item.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          ]"
          @click="emit('navigate', { tab: item.id })"
        >
          <UIcon :name="item.icon" class="size-5 shrink-0" />
          <span class="text-center leading-tight lg:hidden">{{ item.short }}</span>
          <span class="hidden lg:inline">{{ item.label }}</span>
        </button>
        <button v-if="canInstall" type="button" class="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-2.5 lg:text-sm" @click="emit('install')">
          <UIcon name="i-lucide-download" class="size-5 shrink-0" />
          <span class="lg:hidden">Instalar</span>
          <span class="hidden lg:inline">Instalar app</span>
        </button>
      </nav>
    </div>

    <div class="hidden border-t border-slate-800 p-6 text-xs text-slate-400 lg:block">
      <p class="font-semibold text-slate-300">Versión 3.0</p>
      <p class="mt-1">Criterios de usos industriales</p>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  activeTab: { type: String, required: true },
  canConfigure: { type: Boolean, default: false },
  canInstall: { type: Boolean, default: false }
})
const emit = defineEmits(['navigate', 'install'])

const navItems = [
  { id: 'dashboard', icon: 'i-heroicons-squares-2x2', label: 'Dashboard', short: 'Inicio' },
  { id: 'cargar', icon: 'i-heroicons-arrow-up-tray', label: 'Cargar muestra', short: 'Cargar' },
  { id: 'historial', icon: 'i-heroicons-table-cells', label: 'Historial y Base de Datos', short: 'Historial' },
  { id: 'configuracion', icon: 'i-heroicons-cog-6-tooth', label: 'Configuración de IA', short: 'Ajustes' }
]
</script>
