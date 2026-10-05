<script setup lang="ts">
defineProps<{ samples: any[]; loading: boolean; error: string }>()
const searchQuery = defineModel<string>('searchQuery', { default: '' })
const filterStatus = defineModel<string>('filterStatus', { default: 'Todos' })
const emit = defineEmits(['export', 'open-sample', 'delete-sample', 'retry'])

const ANALISIS = [['FRX', (s: any) => s.caco3 != null || s.cao != null], ['DRX', (s: any) => s.tiene_drx], ['Petro', (s: any) => s.tiene_petrografia], ['Térm', (s: any) => s.tiene_termicas]] as const
</script>

<template>
  <UCard class="shadow-sm" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h3 class="font-bold text-slate-800">Registros históricos</h3><p class="text-xs text-slate-500">{{ samples.length }} {{ samples.length === 1 ? 'muestra' : 'muestras' }} · toca una muestra para ver el detalle</p></div>
        <div class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <UInput v-model="searchQuery" size="lg" class="w-full sm:w-64" aria-label="Buscar muestra por ID o ubicación" icon="i-heroicons-magnifying-glass" placeholder="Buscar ID o ubicación…" color="success" />
          <USelect v-model="filterStatus" aria-label="Filtrar resultados" :items="['Todos', 'Con usos aptos', 'Con incumplimientos', 'Con ensayos pendientes', 'Sin informe integral', 'Históricos']" color="success" size="lg" class="w-full sm:w-52" />
          <UButton color="success" variant="outline" size="lg" icon="i-heroicons-document-arrow-down" class="justify-center" @click="emit('export')">Descargar Excel</UButton>
        </div>
      </div>
    </template>

    <div v-if="error" role="alert" class="flex flex-wrap items-center gap-3 p-6 text-sm text-rose-700"><span>{{ error }}</span><UButton variant="outline" color="error" @click="emit('retry')">Reintentar</UButton></div>
    <p v-if="loading && !samples.length" role="status" class="p-6 text-sm text-slate-600">Cargando muestras…</p>
    <div v-if="!samples.length && !loading && !error" class="p-10 text-center">
      <p class="text-slate-500">{{ searchQuery || filterStatus !== 'Todos' ? 'Ninguna muestra coincide con la búsqueda o el filtro.' : 'Aún no hay muestras registradas.' }}</p>
      <UButton v-if="searchQuery || filterStatus !== 'Todos'" class="mt-3" variant="outline" @click="searchQuery = ''; filterStatus = 'Todos'">Limpiar filtros</UButton>
    </div>

    <ul v-if="samples.length" class="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 md:p-4 lg:hidden">
      <li v-for="s in samples" :key="s.id_muestra" class="flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border bg-white p-3 transition-colors active:bg-emerald-50" @click="emit('open-sample', s)">
        <div class="flex items-start justify-between gap-2">
          <button type="button" class="min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" @click.stop="emit('open-sample', s)">
            <span class="block font-semibold text-emerald-700">{{ s.id_muestra }}<span class="sr-only">: ver detalle</span></span>
            <span class="block truncate text-xs text-slate-500">{{ s.direccion_muestreo || s.coordenadas_muestreo || 'Sin ubicación' }}</span>
          </button>
          <UButton color="error" variant="ghost" size="lg" icon="i-heroicons-trash" :aria-label="`Eliminar muestra ${s.id_muestra}`" @click.stop="emit('delete-sample', s.id_muestra)" />
        </div>
        <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div><dt class="text-slate-500">CaCO₃</dt><dd class="font-medium tabular-nums text-slate-800">{{ num(s.caco3, '%') }}</dd></div>
          <div><dt class="text-slate-500">Registro</dt><dd class="text-slate-700">{{ fecha(s.fecha_registro) }}</dd></div>
          <div class="col-span-2"><dt class="text-slate-500">Mejor destino</dt><dd class="text-slate-800"><template v-if="usosAptos(s.dictamenes).length">{{ usoCorto(usosAptos(s.dictamenes)[0]) }}<span v-if="usosAptos(s.dictamenes).length > 1" class="text-slate-500"> +{{ usosAptos(s.dictamenes).length - 1 }}</span></template><span v-else class="text-slate-500">Sin usos aptos</span></dd></div>
        </dl>
        <div class="flex flex-wrap items-center gap-1.5">
          <template v-if="s.resumen">
            <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">✓ {{ s.resumen.aptos }} aptos</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">✕ {{ s.resumen.no_aptos }}</span>
            <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">? {{ s.resumen.pendientes }}</span>
          </template>
          <span v-else class="text-xs text-slate-500">Sin evaluar</span>
          <UBadge v-if="s.informe_integral_estado" size="sm" variant="subtle" :color="s.informe_integral_estado === 'revisado' ? 'success' : 'warning'">{{ s.informe_integral_estado === 'revisado' ? 'Informe revisado' : 'Informe borrador' }}</UBadge>
        </div>
        <div class="flex flex-wrap gap-1"><span v-for="[label, tiene] in ANALISIS" :key="label" class="rounded px-1.5 py-0.5 text-[11px] font-semibold" :class="tiene(s) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500 line-through'">{{ label }}</span></div>
      </li>
    </ul>

    <div v-if="samples.length" class="hidden overflow-x-auto lg:block">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr><th class="px-4 py-3">Muestra</th><th class="px-4 py-3 text-right">CaCO₃</th><th class="px-4 py-3">Análisis</th><th class="px-4 py-3">Usos industriales</th><th class="px-4 py-3">Mejor destino</th><th class="px-4 py-3">Informe</th><th class="px-4 py-3">Registro</th><th class="px-4 py-3"><span class="sr-only">Acciones</span></th></tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="s in samples" :key="s.id_muestra" class="cursor-pointer transition-colors hover:bg-emerald-50/40" @click="emit('open-sample', s)">
            <td class="px-4 py-3">
              <button class="font-semibold text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-600" @click.stop="emit('open-sample', s)">{{ s.id_muestra }}<span class="sr-only">: ver detalle</span></button>
              <p class="max-w-56 truncate text-xs text-slate-500" :title="s.direccion_muestreo || ''">{{ s.direccion_muestreo || s.coordenadas_muestreo || 'Sin ubicación' }}</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{{ num(s.caco3, '%') }}</td>
            <td class="px-4 py-3"><div class="flex gap-1"><span v-for="[label, tiene] in ANALISIS" :key="label" class="rounded px-1.5 py-0.5 text-[11px] font-semibold" :class="tiene(s) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400 line-through'">{{ label }}</span></div></td>
            <td class="px-4 py-3">
              <div v-if="s.resumen" class="flex gap-1.5 text-xs font-semibold tabular-nums" :aria-label="`${s.resumen.aptos} aptos, ${s.resumen.no_aptos} no aptos, ${s.resumen.pendientes} requieren ensayos`">
                <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800" title="Aptos">✓ {{ s.resumen.aptos }}</span>
                <span class="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800" title="No aptos">✕ {{ s.resumen.no_aptos }}</span>
                <span class="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800" title="Requieren ensayos">? {{ s.resumen.pendientes }}</span>
              </div>
              <span v-else class="text-xs text-slate-400">Sin evaluar</span>
            </td>
            <td class="px-4 py-3 text-xs">
              <template v-if="usosAptos(s.dictamenes).length"><span class="font-medium text-slate-800">{{ usoCorto(usosAptos(s.dictamenes)[0]) }}</span><span v-if="usosAptos(s.dictamenes).length > 1" class="text-slate-500"> +{{ usosAptos(s.dictamenes).length - 1 }}</span></template>
              <span v-else class="text-slate-400">Sin dato</span>
            </td>
            <td class="px-4 py-3"><UBadge v-if="s.informe_integral_estado" size="sm" variant="subtle" :color="s.informe_integral_estado === 'revisado' ? 'success' : 'warning'">{{ s.informe_integral_estado === 'revisado' ? 'Revisado' : 'Borrador' }}</UBadge><span v-else class="text-xs text-slate-400">Sin generar</span></td>
            <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{{ fecha(s.fecha_registro) }}</td>
            <td class="px-4 py-3 text-right"><UButton color="error" variant="ghost" icon="i-heroicons-trash" :aria-label="`Eliminar muestra ${s.id_muestra}`" @click.stop="emit('delete-sample', s.id_muestra)" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
