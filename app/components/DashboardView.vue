<script setup lang="ts">
defineProps<{ samples: any[]; loading: boolean; error: string; summaryText: (sample: any) => string }>()
const emit = defineEmits(['navigate', 'export', 'open-sample', 'retry'])
</script>

<template>
  <div class="space-y-4 md:space-y-6">
    <div v-if="error" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{{ error }}</span><UButton size="sm" variant="outline" color="error" @click="emit('retry')">Reintentar</UButton></div>
    <p v-if="loading && !samples.length" role="status" class="text-sm text-slate-600">Cargando muestras…</p>
    <div v-if="!loading && !error" class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 lg:gap-6">
      <UCard v-for="card in [
        ['Total Muestras', samples.length, 'text-slate-900'],
        ['Muestras con usos que cumplen', samples.filter(s => s.resumen?.aptos > 0).length, 'text-emerald-600'],
        ['Muestras con incumplimientos', samples.filter(s => s.resumen?.no_aptos > 0).length, 'text-rose-600'],
        ['Muestras con ensayos pendientes', samples.filter(s => s.resumen?.pendientes > 0).length, 'text-amber-600']
      ]" :key="card[0]" class="shadow-sm"><p class="text-xs font-medium text-slate-500 md:text-sm">{{ card[0] }}</p><p :class="['mt-1 text-2xl font-bold md:text-3xl', card[2]]">{{ card[1] }}</p></UCard>
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <AppSection title="Acceso rápido" description="Registra una muestra con su FRX, DRX, petrografía y propiedades térmicas en un solo paso."><div class="flex gap-3"><UButton color="success" icon="i-heroicons-arrow-up-tray" @click="emit('navigate', 'cargar')">Cargar muestra</UButton></div></AppSection>
      <AppSection title="Base de datos" description="Descarga el archivo Excel con las muestras registradas e históricos."><UButton color="success" variant="outline" icon="i-heroicons-document-arrow-down" @click="emit('export')">Descargar Excel</UButton></AppSection>
    </div>
    <UCard class="shadow-sm"><template #header><div class="flex items-center justify-between"><h3 class="font-bold text-slate-800">Muestras recientes</h3><UButton variant="link" color="success" @click="emit('navigate', 'historial')">Ver todo</UButton></div></template><div v-if="!samples.length && !loading && !error" class="p-8 text-center"><p class="text-slate-500">Aún no hay muestras registradas.</p><UButton class="mt-3" color="success" @click="emit('navigate', 'cargar')">Registrar primera muestra</UButton></div><ul v-if="samples.length" class="divide-y md:hidden"><li v-for="sample in samples.slice(0, 5)" :key="sample.id_muestra"><button type="button" class="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-emerald-600" @click="emit('open-sample', sample)"><span class="min-w-0"><span class="block font-semibold text-emerald-700">{{ sample.id_muestra }}</span><span class="block text-xs text-slate-600">{{ summaryText(sample) }}</span></span><span class="shrink-0 text-xs text-slate-500">{{ fecha(sample.fecha_registro) }}</span></button></li></ul><AppTable v-if="samples.length" class="hidden md:block" label="Muestras recientes"><template #head><tr><th class="px-4 py-3">Muestra</th><th class="px-4 py-3">Resultado</th><th class="px-4 py-3">Fecha</th></tr></template><tr v-for="sample in samples.slice(0, 5)" :key="sample.id_muestra" class="hover:bg-slate-50"><td class="px-4 py-3 font-semibold"><button class="rounded text-left text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" @click="emit('open-sample', sample)">{{ sample.id_muestra }}<span class="sr-only">: ver detalle</span></button></td><td class="px-4 py-3">{{ summaryText(sample) }}</td><td class="px-4 py-3 text-slate-500">{{ fecha(sample.fecha_registro) }}</td></tr></AppTable></UCard>
  </div>
</template>
