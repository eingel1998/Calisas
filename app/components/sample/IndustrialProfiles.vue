<script setup lang="ts">
const props = defineProps<{ dictamenes?: any[]; chemicalText: (text: string) => string }>()
const COLOR: Record<string, string> = { 'Apto': 'bg-emerald-100 text-emerald-800', 'No Apto': 'bg-rose-100 text-rose-800', 'Requiere ensayos': 'bg-amber-100 text-amber-800' }
const porNombre = (nombre: string) => props.dictamenes?.find(d => d.nombre === nombre)
</script>

<template>
  <div class="space-y-5">
    <p v-if="!dictamenes?.length" class="text-sm text-slate-500">Dictámenes no disponibles.</p>
    <section v-for="grupo in NIVELES" v-else :key="grupo.nivel">
      <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ grupo.nivel }}</h4>
      <div class="divide-y rounded-lg border">
        <template v-for="nombre in grupo.usos" :key="nombre">
          <details v-if="porNombre(nombre)" class="group">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
              <span class="flex items-center gap-2"><UIcon name="i-heroicons-chevron-right" class="size-4 text-slate-400 transition-transform group-open:rotate-90" />{{ nombre }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="COLOR[porNombre(nombre).estado]">{{ porNombre(nombre).estado }}</span>
            </summary>
            <div class="space-y-2 border-t bg-slate-50/60 px-4 py-3 text-sm">
              <p class="text-slate-600">{{ chemicalText(porNombre(nombre).aplicacion) }}</p>
              <table class="w-full text-xs">
                <thead class="text-left text-slate-500"><tr><th class="py-1 pr-2 font-medium">Criterio</th><th class="py-1 pr-2 text-right font-medium">Valor</th><th class="py-1 pr-2 font-medium">Procedencia</th><th class="py-1 font-medium">Resultado</th></tr></thead>
                <tbody>
                  <tr v-for="(c, i) in porNombre(nombre).criterios" :key="i" class="border-t">
                    <td class="py-1.5 pr-2">{{ chemicalText(c.etiqueta) }}</td>
                    <td class="py-1.5 pr-2 text-right tabular-nums">{{ num(c.valor, c.unidad) }}</td>
                    <td class="py-1.5 pr-2 text-slate-500">{{ c.procedencia || '-' }}</td>
                    <td class="py-1.5"><span :class="c.estado === 'Cumple' ? 'text-emerald-700' : c.estado === 'Incumple' ? 'text-rose-700' : 'text-amber-700'">{{ c.estado }}</span></td>
                  </tr>
                </tbody>
              </table>
              <ul v-if="porNombre(nombre).observaciones?.length" class="list-disc pl-5 text-xs text-slate-600"><li v-for="(o, i) in porNombre(nombre).observaciones" :key="i">{{ chemicalText(o) }}</li></ul>
              <p class="text-xs text-slate-500">Norma: {{ porNombre(nombre).norma }}</p>
            </div>
          </details>
        </template>
      </div>
    </section>
  </div>
</template>
