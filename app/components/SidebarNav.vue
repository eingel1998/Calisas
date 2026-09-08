<template>
  <aside class="w-64 bg-inverted text-inverted flex flex-col justify-between shrink-0">
    <div>
      <!-- Logo / Title -->
      <div class="p-6 border-b border-inverted">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🪨</span>
          <div>
            <h1 class="font-bold text-lg tracking-tight leading-none text-inverted">Calizas</h1>
            <span class="text-xs text-primary font-medium">Evaluación Geoquímica</span>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="p-4 space-y-1.5">
        <template v-for="item in navItems" :key="item.id">
          <!-- Flat item -->
          <button
            v-if="!item.children"
            @click="emit('navigate', { tab: item.id })"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === item.id ? 'bg-primary text-inverted shadow-md' : 'text-inverted/70 hover:bg-inverted/10 hover:text-inverted'
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
                activeTab === 'evaluar' ? 'bg-primary text-inverted shadow-md' : 'text-inverted/70 hover:bg-inverted/10 hover:text-inverted'
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
                @click="emit('navigate', { tab: 'evaluar', subAnalisis: child.id })"
                :class="[
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  activeTab === 'evaluar' && subAnalisis === child.id
                    ? 'bg-primary text-inverted shadow-md'
                    : 'text-inverted/60 hover:bg-inverted/10 hover:text-inverted'
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
    <div class="p-6 border-t border-inverted text-xs text-inverted/60">
      <p class="font-semibold text-inverted/80">Versión 3.0</p>
      <p class="mt-1">Normativas ASTM C150 / NTC 321</p>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  activeTab: { type: String, required: true },
  subAnalisis: { type: String, default: 'geo' }
})
const emit = defineEmits(['navigate'])

const expanded = ref(true)

const navItems = [
  { id: 'dashboard', icon: 'i-heroicons-squares-2x2', label: 'Dashboard' },
  {
    id: 'evaluar',
    icon: 'i-heroicons-beaker',
    label: 'Evaluar Muestra',
    children: [
      { id: 'geo', label: 'Evaluación geoquímica' },
      { id: 'petrografia', label: 'Análisis Petrografía' },
      { id: 'termicas', label: 'Análisis de propiedades térmicas' }
    ]
  },
  { id: 'historial', icon: 'i-heroicons-table-cells', label: 'Historial y Base de Datos' }
]
</script>