<template>
  <UModal v-model:open="open" @update:open="handleOpenChange">
    <template #content>
      <div class="p-6 space-y-6 bg-elevated rounded-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-default">Evaluar Muestra — PDF/Imagen</h3>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="close" />
        </div>

        <!-- Step 1: Upload & Extract -->
        <div v-if="step === 1" class="space-y-5">
          <div class="border-2 border-dashed border-default rounded-lg p-6 hover:border-primary transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-muted">
            <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" @change="onFilePicked" />
            <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-dimmed mb-2" />
            <p class="text-sm font-semibold text-default">Arrastra o selecciona un archivo</p>
            <p class="text-xs text-muted mt-1">PDF del laboratorio o Imagen (XRF)</p>
          </div>

          <div v-if="file" class="bg-muted p-3 rounded-lg flex items-center justify-between text-sm">
            <div class="flex items-center gap-2 truncate">
              <UIcon name="i-heroicons-document-check" class="text-primary w-5 h-5 shrink-0" />
              <span class="truncate font-medium text-default">{{ file.name }}</span>
            </div>
            <button class="text-error" @click="file = null">
              <UIcon name="i-heroicons-trash" />
            </button>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between gap-4">
              <div>
                <span class="text-sm font-medium text-default">Conversión a Base Seca</span>
                <p class="text-xs text-muted mt-0.5">Desactivado: se usan los valores tal como vienen en el reporte.</p>
              </div>
              <USwitch v-model="convertir" color="primary" class="shrink-0" />
            </div>
            <div v-if="convertir">
              <label class="text-xs text-muted block mb-1">LOI Medido (%) <span class="text-dimmed">(Dejar 0 para estimar)</span></label>
              <UInput v-model.number="loi_manual" type="number" step="0.01" min="0" placeholder="0.0" color="primary" />
            </div>
          </div>

          <UButton block color="primary" :loading="ocrLoading" @click="extract">
            Extraer y Evaluar
          </UButton>
        </div>

        <!-- Step 2: Review & Save -->
        <div v-else-if="step === 2 && form" class="space-y-6">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-default">Resultados de la Extracción</h4>
            <UBadge color="primary" variant="subtle">Extracción Exitosa</UBadge>
          </div>

          <div v-if="form.avisos && form.avisos.length > 0" class="space-y-2">
            <div v-for="aviso in form.avisos" :key="aviso" class="p-3 bg-warning/10 border-l-4 border-warning text-warning rounded text-sm flex gap-2 items-center">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-warning shrink-0" />
              <span>{{ aviso }}</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-default mb-1.5">ID Muestra *</label>
              <UInput v-model="form.datos.muestra_id" required color="primary" />
            </div>
            <div v-for="c in CAMPOS" :key="c.key">
              <label class="block text-sm font-semibold text-default mb-1.5">{{ c.label }}</label>
              <UInput v-model.number="form.datos[c.key]" type="number" step="0.01" min="0" :max="c.max" :placeholder="c.opt ? 'No medido' : undefined" color="primary" />
              <p v-if="origTexto(c)" class="text-xs text-dimmed mt-1">{{ origTexto(c) }}</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-default mb-1.5">Fase Mineral Dominante (DRX)</label>
              <USelect v-model="form.datos.drx" :options="['Calcita', 'Calcita Magnesiana', 'Dolomita']" color="primary" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-default mb-1.5">Textura Dominante (Petrografía)</label>
              <USelect v-model="form.datos.petrografia" :options="['Micrítica de grano fino', 'Esparítica de grano grueso']" color="primary" />
            </div>
          </div>

          <UAccordion
            color="neutral"
            variant="soft"
            :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', content: 'fields' }]"
          >
            <template #item>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-elevated border border-muted rounded-b-lg">
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Poder Neutralizante PN (%)</label>
                  <UInput v-model.number="form.extras.pn" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Blancura (%)</label>
                  <UInput v-model.number="form.extras.blancura" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Tamaño Partícula (µm)</label>
                  <UInput v-model.number="form.extras.tamano_particula" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Humedad (%)</label>
                  <UInput v-model.number="form.extras.humedad" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">CaO Disponible (%)</label>
                  <UInput v-model.number="form.extras.cao_disponible" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">CaO Reactivo (%)</label>
                  <UInput v-model.number="form.extras.cao_reactivo" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Resistencia (MPa)</label>
                  <UInput v-model.number="form.extras.resistencia" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-muted mb-1">Absorción (%)</label>
                  <UInput v-model.number="form.extras.absorcion" type="number" step="0.01" min="0" placeholder="Opcional" color="primary" />
                </div>
              </div>
            </template>
          </UAccordion>

          <div class="flex justify-end gap-3 border-t border-muted pt-6">
            <UButton color="neutral" variant="ghost" @click="clear">Limpiar</UButton>
            <UButton color="primary" icon="i-heroicons-circle-stack" :loading="evalLoading" @click="save">
              Calcular LSF y Registrar Muestra
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
import { ref, watch } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

const props = defineProps({
  ocrResult: { type: Object, default: null },
  ocrLoading: { type: Boolean, default: false },
  evalLoading: { type: Boolean, default: false }
})
const emit = defineEmits(['extract', 'save', 'cancel'])

const toast = useToast()

const step = ref(1)
const file = ref(null)
const convertir = ref(false)
const loi_manual = ref(0)
const form = ref(null)

// hint: false = no mostrar "Reporte:" (caco3 es derivado, no viene en el PDF)
const CAMPOS = [
  { key: 'caco3', label: 'CaCO3 (%)', max: 100, hint: false },
  { key: 'cao', label: 'CaO (%)', max: 100 },
  { key: 'mgo', label: 'MgO (%)', max: 100 },
  { key: 'sio2', label: 'SiO2 (%)', max: 100 },
  { key: 'fe2o3', label: 'Fe2O3 (%)', max: 100 },
  { key: 'al2o3', label: 'Al2O3 (%)', max: 100 },
  { key: 'so3', label: 'SO3 (%)', max: 100, opt: true },
  { key: 'na2o', label: 'Na2O (%)', max: 100, opt: true },
  { key: 'k2o', label: 'K2O (%)', max: 100 },
  { key: 'p2o5', label: 'P2O5 (%)', max: 100, opt: true },
  { key: 'pb', label: 'Plomo - Pb (ppm)', opt: true },
  { key: 'cd', label: 'Cadmio - Cd (ppm)', opt: true },
  { key: 'as_ppm', label: 'Arsénico - As (ppm)', opt: true },
]

// Valor tal como viene en el reporte, para que el usuario pueda cotejar 1:1
// cuando la conversión a base seca cambió los números.
function origTexto(c) {
  if (c.hint === false) return ''
  const o = form.value?.originales?.[c.key]
  if (o === null || o === undefined) return ''
  if (Number(o) === Number(form.value?.datos?.[c.key])) return ''
  return `Reporte: ${o}`
}

function resetLocal() {
  step.value = 1
  file.value = null
  convertir.value = false
  loi_manual.value = 0
  form.value = null
}

function handleOpenChange(val) {
  if (val) {
    resetLocal()
  } else {
    emit('cancel')
  }
}

function close() {
  open.value = false
  emit('cancel')
}

function onFilePicked(event) {
  const f = event.target.files[0]
  if (f) file.value = f
  event.target.value = ''
}

function extract() {
  if (!file.value) {
    toast.add({ title: 'Archivo faltante', description: 'Por favor arrastra o selecciona un archivo primero.', color: 'warning' })
    return
  }
  emit('extract', { file: file.value, convertir: convertir.value, loi_manual: loi_manual.value })
}

watch(() => props.ocrResult, (val) => {
  if (val && val.datos) {
    const datos = { ...val.datos, drx: val.datos.drx || 'Calcita', petrografia: val.datos.petrografia || 'Micrítica de grano fino' }
    // null = no medido → campo vacío (no 0: un 0 se guardaría como medición real)
    for (const k of ['so3', 'na2o', 'p2o5', 'pb', 'cd', 'as_ppm']) {
      if (datos[k] === null || datos[k] === undefined) datos[k] = ''
    }
    form.value = {
      datos,
      originales: val.datos_originales || null,
      extras: { ...val.extras },
      avisos: val.avisos || []
    }
    step.value = 2
  }
})

function save() {
  if (!form.value?.datos?.muestra_id) {
    toast.add({ title: 'ID faltante', description: 'Por favor asigne un ID único a la muestra.', color: 'warning' })
    return
  }
  const d = form.value.datos
  // campo vacío = no medido → null (un 0 falso haría "cumplir" límites de metales pesados)
  const opt = (v) => (v === '' || v === null || v === undefined ? null : v)
  emit('save', {
    muestra_id: d.muestra_id,
    caco3: d.caco3, cao: d.cao, mgo: d.mgo, sio2: d.sio2, fe2o3: d.fe2o3, al2o3: d.al2o3,
    so3: opt(d.so3), na2o: opt(d.na2o), k2o: d.k2o, p2o5: opt(d.p2o5), pb: opt(d.pb), cd: opt(d.cd), as_ppm: opt(d.as_ppm),
    drx: d.drx, petrografia: d.petrografia,
    elementos: d.elementos ?? [],
    extras: { ...form.value.extras },
    archivo_fuente: file.value?.name || 'PDF Upload'
  })
}

function clear() {
  resetLocal()
}
</script>