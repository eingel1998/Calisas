<script setup lang="ts">
defineProps<{ samples: any[]; loading: boolean; error: string; summaryText: (sample: any) => string }>()
const emit = defineEmits(['navigate', 'export', 'open-sample', 'retry'])
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" role="alert" class="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{{ error }}</span><UButton size="sm" variant="outline" color="error" @click="emit('retry')">Reintentar</UButton></div>
    <p v-if="loading && !samples.length" role="status" class="text-sm text-slate-600">Cargando muestras…</p>
    <div v-if="!loading && !error" class="grid grid-cols-1 gap-6 md:grid-cols-4">
      <UCard v-for="card in [
        ['Total Muestras', samples.length, 'text-slate-900'],
        ['Muestras con usos que cumplen', samples.filter(s => s.resumen?.aptos > 0).length, 'text-emerald-600'],
        ['Muestras con incumplimientos', samples.filter(s => s.resumen?.no_aptos > 0).length, 'text-rose-600'],
        ['Muestras con ensayos pendientes', samples.filter(s => s.resumen?.pendientes > 0).length, 'text-amber-600']
      ]" :key="card[0]" class="shadow-sm"><p class="text-sm font-medium text-slate-500">{{ card[0] }}</p><p :class="['mt-1 text-3xl font-bold', card[2]]">{{ card[1] }}</p></UCard>
    </div>
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <AppSection title="Acceso rápido" description="Evalúa una muestra desde un informe XRF o mediante entrada manual."><div class="flex gap-3"><UButton color="success" @click="emit('navigate', 'manual')">Entrada manual</UButton><UButton color="neutral" variant="soft" @click="emit('navigate', 'pdf')">Subir PDF</UButton></div></AppSection>
      <AppSection title="Base de datos" description="Descarga el archivo Excel con las muestras registradas e históricos."><UButton color="success" variant="outline" icon="i-heroicons-document-arrow-down" @click="emit('export')">Descargar Excel</UButton></AppSection>
    </div>
    <UCard class="shadow-sm"><template #header><div class="flex items-center justify-between"><h3 class="font-bold text-slate-800">Muestras recientes</h3><UButton variant="link" color="success" @click="emit('navigate', 'historial')">Ver todo</UButton></div></template><div v-if="!samples.length && !loading && !error" class="p-8 text-center"><p class="text-slate-500">Aún no hay muestras registradas.</p><UButton class="mt-3" color="success" @click="emit('navigate', 'manual')">Registrar primera muestra</UButton></div><AppTable v-else-if="samples.length" label="Muestras recientes"><template #head><tr><th class="px-4 py-3">Muestra</th><th class="px-4 py-3">Resultado</th><th class="px-4 py-3">Fecha</th></tr></template><tr v-for="sample in samples.slice(0, 5)" :key="sample.id_muestra" class="hover:bg-slate-50"><td class="px-4 py-3 font-semibold"><button class="rounded text-left text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" @click="emit('open-sample', sample)">{{ sample.id_muestra }}<span class="sr-only">: ver detalle</span></button></td><td class="px-4 py-3">{{ summaryText(sample) }}</td><td class="px-4 py-3">{{ sample.fecha_registro }}</td></tr></AppTable></UCard>
  </div>
</template>
