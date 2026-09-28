<script setup lang="ts">
import { onMounted, ref } from 'vue'

const toast = useToast()
const baseURL = ref('')
const model = ref('')
const apiKey = ref('')
const hasKey = ref(false)
const busy = ref(false)
const error = ref('')

async function cargar() {
  try {
    const config = await $fetch<{ baseURL: string; model: string; hasKey: boolean }>('/api/configuracion-ia')
    baseURL.value = config.baseURL
    model.value = config.model
    hasKey.value = config.hasKey
  } catch (e: any) { error.value = e.data?.statusMessage || 'No se pudo cargar la configuración' }
}

async function guardar() {
  busy.value = true
  error.value = ''
  try {
    const config = await $fetch<{ baseURL: string; model: string; hasKey: boolean }>('/api/configuracion-ia', {
      method: 'PUT', body: { baseURL: baseURL.value, model: model.value, apiKey: apiKey.value },
    })
    baseURL.value = config.baseURL
    model.value = config.model
    hasKey.value = config.hasKey
    apiKey.value = ''
    toast.add({ title: 'Configuración de IA guardada', color: 'success' })
  } catch (e: any) { error.value = e.data?.statusMessage || 'No se pudo guardar la configuración' }
  finally { busy.value = false }
}

onMounted(cargar)
</script>

<template>
  <div class="max-w-2xl space-y-5">
    <div><h2 class="text-2xl font-bold">Configuración de IA</h2><p class="text-sm text-slate-600">Proveedor y modelo para los borradores de petrografía. Los cambios se aplican a los próximos análisis sin desplegar.</p></div>
    <UCard>
      <form class="space-y-4" @submit.prevent="guardar">
        <UFormField label="URL base del proveedor"><UInput v-model="baseURL" type="url" required class="w-full" placeholder="https://openrouter.ai/api/v1" /></UFormField>
        <UFormField label="Modelo con visión"><UInput v-model="model" required class="w-full" placeholder="google/gemma-4-31b-it:free" /></UFormField>
        <UFormField label="Clave API"><UInput v-model="apiKey" type="password" autocomplete="new-password" class="w-full" placeholder="Déjala vacía para conservar la clave actual" /></UFormField>
        <p class="text-xs text-slate-500">{{ hasKey ? 'Hay una clave configurada.' : 'Falta configurar una clave válida.' }} La clave guardada nunca se muestra aquí. Cambiar el secreto BETTER_AUTH_SECRET del servidor requiere volver a introducirla.</p>
        <p v-if="error" role="alert" class="text-sm text-rose-600">{{ error }}</p>
        <UButton type="submit" color="success" :loading="busy">Guardar configuración</UButton>
      </form>
    </UCard>
  </div>
</template>
