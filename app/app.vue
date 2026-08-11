<template>
  <UApp>
    <div class="min-h-screen bg-default text-default flex">
    <SidebarNav :active-tab="activeTab" :sub-analisis="subAnalisis" @navigate="onNavigate" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top header bar -->
      <header class="bg-elevated border-b border-default h-16 flex items-center justify-between px-8 shrink-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold text-default capitalize">{{ activeTab }}</h2>
          <span class="text-xs bg-muted text-muted px-2 py-0.5 rounded-full border border-default">Local DB (SQLite)</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted">Backend unificado: <b class="text-primary font-medium">Conectado</b></span>
        </div>
      </header>

      <!-- Content Views -->
      <div class="p-8 max-w-7xl w-full mx-auto flex-1">
        <DashboardView
          v-if="activeTab === 'dashboard'"
          :samples="samples"
          @open-sample="openSampleInGeo"
          @open-modal="openModal"
          @open-all="() => onNavigate({ tab: 'historial' })"
          @export-excel="downloadExcel"
        />

        <EvaluarView
          v-else-if="activeTab === 'evaluar' && subAnalisis === 'geo'"
          :samples="samples"
          :selected-sample="selectedSample"
          @open-modal="openModal"
          @select-sample="openSampleInGeo"
        />

        <ComingSoonView
          v-else-if="activeTab === 'evaluar' && subAnalisis === 'petrografia'"
          title="Análisis Petrografía"
          icon="i-lucide-microscope"
        />

        <ComingSoonView
          v-else-if="activeTab === 'evaluar' && subAnalisis === 'termicas'"
          title="Análisis de propiedades térmicas"
          icon="i-heroicons-fire"
        />

        <HistorialView
          v-else
          :samples="samples"
          v-model:search-query="searchQuery"
          v-model:filter-status="filterStatus"
          @open-sample="openSampleInGeo"
          @delete-sample="confirmDeleteSample"
          @export-excel="downloadExcel"
        />
      </div>
    </main>

    <EvaluarPdfModal v-model:open="pdfOpen" :ocr-result="ocrResult" :ocr-loading="ocrLoading" :eval-loading="evalLoading" @extract="processPdf" @save="saveEvaluation" />
    <EvaluarManualModal v-model:open="manualOpen" :eval-loading="evalLoading" @save="saveEvaluation" />
    <EvaluarBatchModal v-model:open="batchOpen" :batch-loading="batchLoading" @process="submitBatchFile" />
    <ConfirmDeleteModal v-model:open="deleteModalOpen" :sample-id="sampleToDelete" :loading="deleteLoading" @confirm="executeDeleteSample" />
    </div>
  </UApp>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const activeTab = ref('dashboard')
const subAnalisis = ref('geo')
const modalType = ref(null)

// Data State
const samples = ref([])
const searchQuery = ref('')
const filterStatus = ref('Todos')

// OCR / eval state
const ocrLoading = ref(false)
const ocrResult = ref(null)
const evalLoading = ref(false)
const batchLoading = ref(false)

// Active sample (ResultCard) + delete dialog state
const selectedSample = ref(null)
const deleteModalOpen = ref(false)
const sampleToDelete = ref('')
const deleteLoading = ref(false)

// Toast alerts using Nuxt UI standard structure
const toast = useToast()

// Lifecycle
onMounted(() => {
  fetchHistorial()
})

// Methods
async function fetchHistorial() {
  try {
    const data = await $fetch(`${apiBase}/historial`)
    samples.value = data || []
  } catch (e) {
    toast.add({
      title: 'Error de Red',
      description: 'No se pudo conectar con la API. Verifica que el servidor esté corriendo.',
      color: 'error'
    })
  }
}

// Navigation (sidebar { tab, subAnalisis })
function onNavigate({ tab, subAnalisis: sub }) {
  activeTab.value = tab
  if (tab === 'evaluar') {
    if (sub) subAnalisis.value = sub
  } else {
    subAnalisis.value = 'geo'
  }
}

// Modal opening (header buttons / dashboard quick actions)
function openModal(type) {
  activeTab.value = 'evaluar'
  subAnalisis.value = 'geo'
  modalType.value = type
}

const pdfOpen = computed({
  get: () => modalType.value === 'pdf',
  set: (v) => { if (!v) modalType.value = null }
})
const manualOpen = computed({
  get: () => modalType.value === 'manual',
  set: (v) => { if (!v) modalType.value = null }
})
const batchOpen = computed({
  get: () => modalType.value === 'batch',
  set: (v) => { if (!v) modalType.value = null }
})

// PDF extraction (from EvaluarPdfModal extract event)
async function processPdf({ file, convertir, loi_manual }) {
  if (!file) {
    toast.add({ title: 'Archivo faltante', description: 'Por favor arrastra o selecciona un archivo primero.', color: 'warning' })
    return
  }

  ocrLoading.value = true
  const formData = new FormData()
  formData.append('file', file)
  formData.append('convertir', convertir ? 'true' : 'false')
  if (convertir && loi_manual) {
    formData.append('loi_manual', String(loi_manual))
  }

  try {
    const data = await $fetch(`${apiBase}/procesar-pdf`, {
      method: 'POST',
      body: formData
    })

    ocrResult.value = {
      datos: {
        muestra_id: data.datos.muestra_id || '',
        caco3: data.datos.caco3 || 0.0,
        cao: data.datos.cao || 0.0,
        mgo: data.datos.mgo || 0.0,
        sio2: data.datos.sio2 || 0.0,
        fe2o3: data.datos.fe2o3 || 0.0,
        al2o3: data.datos.al2o3 || 0.0,
        so3: data.datos.so3 || 0.0,
        na2o: data.datos.na2o || 0.0,
        k2o: data.datos.k2o || 0.0,
        p2o5: data.datos.p2o5 || 0.0,
        pb: data.datos.pb || 0.0,
        cd: data.datos.cd || 0.0,
        as_ppm: data.datos.as_ppm || 0.0,
        drx: 'Calcita',
        petrografia: 'Micrítica de grano fino'
      },
      extras: {
        pn: null, blancura: null, tamano_particula: null, humedad: null,
        cao_disponible: null, cao_reactivo: null, resistencia: null, absorcion: null
      },
      avisos: data.avisos || []
    }
    toast.add({ title: 'Extracción completada', description: 'Revisa y ajusta los valores antes de guardar.', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error de Extracción', description: e.data?.detail || 'No se pudo leer el PDF. Asegúrate de subir el reporte de Sample Results.', color: 'error' })
  } finally {
    ocrLoading.value = false
  }
}

// Save evaluation (from EvaluarPdfModal / EvaluarManualModal save event)
async function saveEvaluation(payload) {
  evalLoading.value = true
  try {
    const muestraId = payload.muestra_id || payload.id_muestra
    const bodyPayload = {
      id_muestra: muestraId,
      caco3: payload.caco3 || 0,
      cao: payload.cao || 0,
      mgo: payload.mgo || 0,
      sio2: payload.sio2 || 0,
      fe2o3: payload.fe2o3 || 0,
      al2o3: payload.al2o3 || 0,
      so3: payload.so3 || 0,
      na2o: payload.na2o || 0,
      k2o: payload.k2o || 0,
      p2o5: payload.p2o5 || 0,
      pb: payload.pb || 0,
      cd: payload.cd || 0,
      as_ppm: payload.as_ppm || 0,
      drx: payload.drx || 'Calcita',
      petrografia: payload.petrografia || 'Micrítica de grano fino',
      extras: payload.extras || {},
      archivo_fuente: payload.archivo_fuente || 'PDF Upload',
      guardar_db: true
    }

    await $fetch(`${apiBase}/evaluar`, {
      method: 'POST',
      body: bodyPayload
    })

    toast.add({
      title: 'Muestra Registrada',
      description: payload.archivo_fuente === 'Formulario manual'
        ? `Muestra "${muestraId}" evaluada y registrada con éxito.`
        : `La muestra "${muestraId}" se guardó en SQLite exitosamente.`,
      color: 'success'
    })
    await postSave()
  } catch (e) {
    toast.add({ title: 'Error de Guardado', description: e.data?.detail || 'No se pudo calcular/guardar la muestra.', color: 'error' })
  } finally {
    evalLoading.value = false
  }
}

// Batch upload (from EvaluarBatchModal process event)
async function submitBatchFile(file) {
  if (!file) return
  batchLoading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    const data = await $fetch(`${apiBase}/procesar-lote`, {
      method: 'POST',
      body: formData
    })
    toast.add({ title: 'Carga Masiva Exitosa', description: `Se procesaron e insertaron ${data.count} muestras exitosamente.`, color: 'success' })
    await postSave()
  } catch (e) {
    toast.add({ title: 'Error de Lote', description: e.data?.detail || 'No se pudo procesar el archivo por lotes.', color: 'error' })
  } finally {
    batchLoading.value = false
  }
}

// Unified post-save: close modal, refresh list, stay in evaluar/geo with newest sample
async function postSave() {
  modalType.value = null
  await fetchHistorial()
  selectedSample.value = samples.value[0] || null
}

// Open a sample from SamplesTable / Dashboard / Historial → geo results
function openSampleInGeo(sample) {
  selectedSample.value = sample
  activeTab.value = 'evaluar'
  subAnalisis.value = 'geo'
}

// Delete Handlers
function confirmDeleteSample(id) {
  sampleToDelete.value = id
  deleteModalOpen.value = true
}

async function executeDeleteSample() {
  if (!sampleToDelete.value) return
  deleteLoading.value = true
  try {
    await $fetch(`${apiBase}/historial/${encodeURIComponent(sampleToDelete.value)}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Muestra Eliminada', description: `La muestra "${sampleToDelete.value}" se borró exitosamente.`, color: 'success' })
    await fetchHistorial()
    selectedSample.value = samples.value.some(s => s.id_muestra === selectedSample.value?.id_muestra)
      ? selectedSample.value
      : (samples.value[0] || null)
  } catch (e) {
    toast.add({ title: 'Error de Eliminación', description: 'No se pudo borrar el registro.', color: 'error' })
  } finally {
    deleteLoading.value = false
    deleteModalOpen.value = false
    sampleToDelete.value = ''
  }
}

// Download Excel
function downloadExcel() {
  window.open(`${apiBase}/exportar-excel`, '_blank')
}
</script>
