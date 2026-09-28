<template>
  <button v-if="mobileOpen" class="fixed inset-0 z-40 bg-slate-950/60 md:hidden" aria-label="Cerrar menú" @click="mobileOpen = false" />
  <aside class="fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col justify-between overflow-y-auto bg-slate-900 text-white transition-transform duration-200 md:static md:min-h-screen md:translate-x-0" :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'" aria-label="Navegación principal">
    <div>
      <!-- Logo / Title -->
      <div class="p-6 border-b border-inverted">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🪨</span>
          <div>
              <h1 class="font-bold text-lg tracking-tight leading-none text-slate-100">Calizas</h1>
              <span class="text-xs text-emerald-400 font-medium">Análisis de calizas</span>
          </div>
        </div>
        <button class="absolute right-4 top-4 rounded p-2 text-slate-300 hover:text-white md:hidden" aria-label="Cerrar menú" @click="mobileOpen = false"><UIcon name="i-heroicons-x-mark" class="size-5" /></button>
      </div>

      <!-- Navigation Menu -->
      <nav class="p-4 space-y-1.5">
        <template v-for="item in navItems.filter(item => item.id !== 'configuracion' || canConfigure)" :key="item.id">
          <!-- Flat item -->
          <button
            v-if="!item.children"
            @click="navigate({ tab: item.id })"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === item.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            ]"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
            <span>{{ item.label }}</span>
          </button>

          <!-- Collapsible item -->
          <div v-else>
            <button
              @click="expanded = !expanded"
              :class="[
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'evaluar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              ]"
            >
              <UIcon :name="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
              <UIcon :name="expanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="w-4 h-4 ml-auto shrink-0" />
            </button>

            <div v-if="expanded" class="mt-1 space-y-1 pl-9">
              <button
                v-for="child in item.children"
                :key="child.id"
                @click="navigate({ tab: 'evaluar', subAnalisis: child.id })"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'evaluar' && subAnalisis === child.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                ]"
              >
                {{ child.label }}
              </button>
            </div>
          </div>
        </template>
      </nav>
    </div>

    <!-- Footer / Credits -->
    <div class="p-6 border-t border-slate-800 text-xs text-slate-500">
      <p class="font-semibold text-slate-400">Versión 3.0</p>
      <p class="mt-1">Criterios de usos industriales</p>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'

const mobileOpen = defineModel('mobileOpen', { default: false })

defineProps({
  activeTab: { type: String, required: true },
  subAnalisis: { type: String, default: 'geo' },
  canConfigure: { type: Boolean, default: false }
})
const emit = defineEmits(['navigate'])
function navigate(target) { mobileOpen.value = false; emit('navigate', target) }

const expanded = ref(true)

const navItems = [
  { id: 'dashboard', icon: 'i-heroicons-squares-2x2', label: 'Dashboard' },
  {
    id: 'evaluar',
    icon: 'i-heroicons-beaker',
    label: 'Evaluar Muestra',
    children: [
      { id: 'petrografia', label: 'Análisis Petrografía' },
      { id: 'geoquimica', label: 'Evaluación geoquímica' },
      { id: 'termicas', label: 'Análisis de propiedades térmicas' }
    ]
  },
  { id: 'historial', icon: 'i-heroicons-table-cells', label: 'Historial y Base de Datos' },
  { id: 'configuracion', icon: 'i-heroicons-cog-6-tooth', label: 'Configuración de IA' }
]
</script>
