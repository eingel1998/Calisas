<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Clave = 'informe' | 'mercado' | 'region' | 'busqueda_web' | 'petrografia' | 'drx' | 'frx' | 'termicas'
const toast = useToast()
const baseURL = ref('')
const model = ref('')
const apiKey = ref('')
const hasKey = ref(false)
const savedKey = ref(false)
const prompts = ref<Record<Clave, string>>({ informe: '', mercado: '', region: '', busqueda_web: '', petrografia: '', drx: '', frx: '', termicas: '' })
const defaults = ref<Partial<Record<Clave, string>>>({})
const busy = ref(false)
const error = ref('')

// Jerarquía: el documento consolida; la petrografía es el estudio principal con DRX y FRX como apoyo; térmicas va aparte.
const bloques: Array<{ clave: Clave; titulo: string; ayuda: string; nivel: 0 | 1 }> = [
  { clave: 'informe', titulo: 'Informe integral · valorización comercial', ayuda: 'Rol y propósito del informe consolidado: a qué mercados puede ir la caliza.', nivel: 0 },
  { clave: 'mercado', titulo: 'Criterios del análisis de mercado', ayuda: 'Cómo analizar mercados, logística y prioridades. Agrega aquí precios por tonelada, compradores o distancias reales si los conoces.', nivel: 1 },
  { clave: 'petrografia', titulo: 'Caracterización petrográfica', ayuda: 'Estudio principal: secciones delgadas. Genera el informe de petrografía (también el borrador del módulo).', nivel: 0 },
  { clave: 'drx', titulo: 'Apoyo: difracción de rayos X (DRX)', ayuda: 'Se incluye solo si la muestra tiene DRX.', nivel: 1 },
  { clave: 'frx', titulo: 'Apoyo: geoquímica (FRX)', ayuda: 'Siempre se incluye: el FRX es obligatorio.', nivel: 1 },
  { clave: 'termicas', titulo: 'Propiedades termofísicas', ayuda: 'Ensayo físico aparte; se incluye solo si la muestra lo tiene.', nivel: 0 },
]

function aplicar(config: any) {
  baseURL.value = config.baseURL
  model.value = config.model
  hasKey.value = config.hasKey
  savedKey.value = config.savedKey
  prompts.value = { ...prompts.value, ...(config.prompts || {}) }
  if (config.defaults) defaults.value = config.defaults
}

async function cargar() {
  try { aplicar(await $fetch('/api/configuracion-ia')) }
  catch (e: any) { error.value = e.data?.statusMessage || 'No se pudo cargar la configuración' }
}

async function guardar() {
  busy.value = true
  error.value = ''
  try {
    aplicar(await $fetch('/api/configuracion-ia', { method: 'PUT', body: { baseURL: baseURL.value, model: model.value, apiKey: apiKey.value, prompts: prompts.value } }))
    apiKey.value = ''
    toast.add({ title: 'Configuración de IA guardada', color: 'success' })
  } catch (e: any) { error.value = e.data?.statusMessage || 'No se pudo guardar la configuración' }
  finally { busy.value = false }
}

onMounted(cargar)
</script>

<template>
  <div class="max-w-3xl space-y-5">
    <div><h2 class="text-2xl font-bold">Configuración de IA</h2><p class="text-sm text-slate-600">Proveedor, modelo y system prompts del informe integral y del borrador petrográfico. Los cambios se aplican a los próximos análisis sin desplegar.</p></div>
    <form class="space-y-5" @submit.prevent="guardar">
      <UCard><div class="space-y-4">
        <UFormField label="URL base del proveedor"><UInput v-model="baseURL" type="url" required class="w-full" placeholder="https://openrouter.ai/api/v1" /></UFormField>
        <UFormField label="Modelo con visión"><UInput v-model="model" required class="w-full" placeholder="google/gemini-3.8-flash" /></UFormField>
        <UFormField label="Clave API"><UInput v-model="apiKey" type="password" autocomplete="new-password" class="w-full" placeholder="Déjala vacía para conservar la clave actual" /></UFormField>
        <p v-if="savedKey" class="text-xs text-emerald-700">✓ Hay una clave guardada aquí. Nunca se muestra; escribe una nueva solo para reemplazarla.</p>
        <p v-else-if="hasKey" class="rounded border-l-4 border-amber-500 bg-amber-50 p-2 text-xs text-amber-800">No hay clave guardada aquí: se está usando la del archivo <code>.env</code> del servidor, que puede ser de otro proveedor. Pega la clave del proveedor de arriba y guarda.</p>
        <p v-else class="text-xs text-rose-700">Falta la clave API del proveedor.</p>
        <p class="text-xs text-slate-500">Cambiar el secreto BETTER_AUTH_SECRET del servidor obliga a volver a introducir la clave.</p>
      </div></UCard>

      <UCard>
        <template #header><p class="font-semibold">Búsqueda web en el informe integral</p><p class="text-xs text-slate-500">El modelo busca en internet compradores, competidores, precios y logística alrededor de la ubicación de cada muestra, y cita las fuentes. Solo con OpenRouter como proveedor; cuesta ~US$0,007 por búsqueda (máx. 8 por informe).</p></template>
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-sm font-medium"><input type="checkbox" class="size-4 accent-emerald-600" :checked="prompts.busqueda_web === '1'" @change="prompts.busqueda_web = ($event.target as HTMLInputElement).checked ? '1' : ''">Activar búsqueda web</label>
          <UFormField label="Región de mercado a considerar" help="Opcional. Se suma a la dirección y coordenadas de cada muestra. Ej: Colombia, radio de 200 km, salida por puertos del Caribe."><UInput v-model="prompts.region" class="w-full" placeholder="Colombia, radio de 200 km" /></UFormField>
        </div>
      </UCard>

      <div><h3 class="text-lg font-bold">System prompts</h3><p class="text-xs text-slate-500">Un prompt por análisis. Vacío = se usa el prompt por defecto (visible como texto de ejemplo). Las reglas anti-invención, el formato de secciones y la matriz de usos industriales se agregan siempre y no se editan aquí.</p></div>
      <UCard v-for="b in bloques" :key="b.clave" :class="b.nivel ? 'ml-8 border-l-4 border-emerald-300' : ''">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div><p class="font-semibold">{{ b.titulo }}</p><p class="text-xs text-slate-500">{{ b.ayuda }}</p></div>
            <UBadge :color="prompts[b.clave] ? 'success' : 'neutral'" variant="subtle">{{ prompts[b.clave] ? 'Personalizado' : 'Por defecto' }}</UBadge>
          </div>
        </template>
        <UTextarea v-model="prompts[b.clave]" :rows="b.nivel ? 8 : 10" :placeholder="defaults[b.clave]" :aria-label="b.titulo" class="w-full font-mono text-xs" />
        <div class="mt-2 flex gap-3 text-xs">
          <button v-if="!prompts[b.clave] && defaults[b.clave]" type="button" class="text-emerald-700 underline" @click="prompts[b.clave] = defaults[b.clave] || ''">Copiar el prompt por defecto para editarlo</button>
          <button v-if="prompts[b.clave]" type="button" class="text-slate-500 underline" @click="prompts[b.clave] = ''">Volver al prompt por defecto</button>
        </div>
      </UCard>

      <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
      <UButton type="submit" color="success" :loading="busy">Guardar configuración</UButton>
    </form>
  </div>
</template>
