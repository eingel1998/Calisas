<template>
  <UApp>
    <div v-if="sessionPending" class="min-h-screen bg-slate-50 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-emerald-600" />
    </div>
    <div v-else-if="!session" class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form class="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-8 shadow-lg space-y-4" @submit.prevent="handleLogin">
        <h1 class="text-lg font-bold text-slate-800">Ingresar a Calizas</h1>
        <UFormField label="Correo"><UInput v-model="loginForm.email" type="email" autocomplete="username" required class="w-full" /></UFormField>
        <UFormField label="Contraseña"><UInput v-model="loginForm.password" type="password" autocomplete="current-password" required class="w-full" /></UFormField>
        <p v-if="loginError" class="text-sm text-rose-600">{{ loginError }}</p>
        <UButton type="submit" block color="success" :loading="loginLoading">Ingresar</UButton>
      </form>
    </div>
    <div v-else class="min-h-screen bg-slate-50 text-slate-800 flex">
    <SidebarNav
      :active-tab="activeTab"
      :sub-analisis="subTab"
      @navigate="({ tab, subAnalisis }) => { activeTab = tab; if (subAnalisis) subTab = subAnalisis }"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top header bar -->
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold text-slate-800 capitalize">{{ activeTab }}</h2>
          <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">Local DB (SQLite)</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-slate-500">Evaluación de usos industriales</span>
          <UButton variant="ghost" color="neutral" icon="i-lucide-log-out" size="sm" @click="handleLogout">Salir</UButton>
        </div>
      </header>

      <!-- Content Views -->
      <div class="p-8 max-w-7xl w-full mx-auto flex-1">

        <DashboardView v-if="activeTab === 'dashboard'" :samples="samples" :summary-text="summaryText" @navigate="target => { activeTab = target === 'historial' ? 'historial' : 'evaluar'; if (target !== 'historial') subTab = target }" @export="downloadExcel" @open-sample="viewSampleDetails" />

        <PetrografiaView v-if="activeTab === 'evaluar' && subTab === 'petrografia'" :samples="samples" :api-base="apiBase" />
        <EvaluationView v-else-if="activeTab === 'evaluar'" v-model:sub-tab="subTab">
          <template #context>
            <EvaluationContextPanel v-model:options="analysisOptions" :base-options="baseOptions" :is-batch="subTab === 'batch'" />
          </template>
          <template #pdf>
            <PdfEvaluationPanel v-model:result="ocrResult" :file-name="uploadedFileName" :extracting="ocrLoading" :saving="evalLoading" :chemical-fields="chemicalFields" :drx-options="drxOptions" :petrografia-options="petrografiaOptions" :chemical-text="chemicalText" @select-file="handleFileUpload" @clear-file="clearUploadedFile" @extract="processUploadedFile" @clear-result="clearOcr" @save="saveEvaluation" />
          </template>
          <template #manual>
            <ManualEvaluationForm v-model:form="manualForm" :loading="evalLoading" :drx-options="drxOptions" :petrografia-options="petrografiaOptions" @submit="submitManualForm" />
          </template>
          <template #batch>
            <BatchEvaluationPanel :file-name="batchFileName" :has-file="Boolean(batchFile)" :loading="batchLoading" @select-file="handleBatchFile" @submit="submitBatchFile" />
          </template>
        </EvaluationView>

        <HistorialView v-if="activeTab === 'historial'" v-model:search-query="searchQuery" v-model:filter-status="filterStatus" :samples="filteredSamples" :show-number="showNumber" :summary-text="summaryText" @export="downloadExcel" @open-sample="viewSampleDetails" @delete-sample="confirmDeleteSample" />

      </div>
    </main>

    <SampleDetailDrawer v-model:open="drawerOpen" :sample="selectedSample">
      <SampleAnalysisDetails :sample="selectedSample" :chemical-fields="chemicalFields" :show-number="showNumber" :chemical-text="chemicalText" :file="evidenceFile" :confirmed="evidenceConfirmed" :replace="replaceEvidence" :loading="evidenceLoading" :api-base="apiBase" @select-evidence="selectEvidence" @update:confirmed="evidenceConfirmed = $event" @update:replace="replaceEvidence = $event" @upload-evidence="uploadEvidence" />
    </SampleDetailDrawer>

    <!-- CONFIRM DELETE DIALOG -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6 space-y-4 bg-white rounded-lg">
          <h3 class="font-bold text-lg text-slate-900">¿Estás seguro de eliminar esta muestra?</h3>
          <p class="text-sm text-slate-600">Esta acción es irreversible y eliminará de forma permanente el registro "{{ sampleToDelete }}" de la base de datos SQLite.</p>
          <div class="flex justify-end gap-3 pt-2">
            <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
            <UButton color="error" :loading="deleteLoading" @click="executeDeleteSample">Eliminar Permanentemente</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- NOTIFICATIONS PROVIDER FOR TOASTS -->

    </div>
  </UApp>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { authClient } from '~/utils/auth-client'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const sessionState = authClient.useSession()
const session = computed(() => sessionState.value?.data ?? null)
const sessionPending = computed(() => sessionState.value?.isPending ?? true)
const loginForm = ref({ email: '', password: '' })
const loginLoading = ref(false)
const loginError = ref('')

async function handleLogin() {
  loginLoading.value = true
  loginError.value = ''
  const { error } = await authClient.signIn.email(loginForm.value)
  if (error) loginError.value = error.message || 'Credenciales inválidas.'
  loginLoading.value = false
}

async function handleLogout() {
  await authClient.signOut()
  samples.value = []
}

const activeTab = ref('dashboard')
const subTab = ref('pdf')

// Data State
const samples = ref([])
const searchQuery = ref('')
const filterStatus = ref('Todos')

// File processing state
const uploadedFile = ref(null)
const uploadedFileName = ref('')
const ocrLoading = ref(false)
const ocrResult = ref(null)
const baseOptions = [{ label: 'Automática', value: 'desconocida' }, { label: 'Seca', value: 'seca' }, { label: 'Calcinada', value: 'calcinada' }]
const drxOptions = [{ label: 'Sin dato', value: null }, 'Calcita', 'Calcita Magnesiana', 'Dolomita']
const petrografiaOptions = [{ label: 'Sin dato', value: null }, 'Micrítica de grano fino', 'Esparítica de grano grueso']
const newContext = () => ({ base: 'desconocida', base_trazas: 'desconocida', convertir: false, estimar_loi: false, loi: null })
const contexts = ref({ pdf: newContext(), manual: newContext(), batch: newContext() })
const analysisOptions = computed(() => contexts.value[subTab.value])
function evaluationContext(tab, originales = []) {
  const c = contexts.value[tab]
  return { ...c, originales, loi: c.loi === '' ? null : c.loi,
    convertir: c.base === 'calcinada' && c.convertir,
    estimar_loi: c.base === 'calcinada' && c.convertir && c.estimar_loi && (c.loi == null || c.loi === '') }
}

// Manual Form State
const manualForm = ref({
  id_muestra: '',
  caco3: null,
  cao: null,
  mgo: null,
  sio2: null,
  fe2o3: null,
  al2o3: null,
  so3: null,
  na2o: null,
  k2o: null,
  p2o5: null,
  pb: null,
  cd: null,
  as_ppm: null,
  drx: null,
  petrografia: null,
  extras: {
    pn: null,
    blancura: null,
    tamano_particula: null,
    humedad: null,
    cao_disponible: null,
    cao_reactivo: null,
    resistencia: null,
    absorcion: null
  }
})

// Batch Loading state
const batchFile = ref(null)
const batchFileName = ref('')
const batchLoading = ref(false)

// Evaluation loading
const evalLoading = ref(false)

// Detail Drawer state
const drawerOpen = ref(false)
const selectedSample = ref(null)

// Delete Dialog State
const deleteModalOpen = ref(false)
const sampleToDelete = ref('')
const deleteLoading = ref(false)

// Toast alerts using Nuxt UI standard structure
const toast = useToast()

// Computed filtering
const filteredSamples = computed(() => {
  return samples.value.filter(s => {
    const matchesSearch = s.id_muestra.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = filterStatus.value === 'Todos' ||
      (filterStatus.value === 'Con usos aptos' && s.resumen?.aptos > 0) ||
      (filterStatus.value === 'Con incumplimientos' && s.resumen?.no_aptos > 0) ||
      (filterStatus.value === 'Con ensayos pendientes' && s.resumen?.pendientes > 0) ||
      (filterStatus.value === 'Históricos' && s.version_evaluacion !== 2)
    return matchesSearch && matchesStatus
  })
})

watch(session, (actual, previo) => {
  if (actual && !previo) fetchHistorial()
}, { immediate: true })

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

// Upload handlers
function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file && !file.name.toLowerCase().endsWith('.pdf')) {
    clearUploadedFile()
    toast.add({ title: 'Selecciona un PDF de resultados', color: 'error' })
    event.target.value = ''
    return
  }
  if (file) {
    clearOcr()
    uploadedFile.value = file
    uploadedFileName.value = file.name
  }
}

function clearUploadedFile() {
  uploadedFile.value = null
  uploadedFileName.value = ''
  clearOcr()
}

function clearOcr() {
  ocrResult.value = null
}

async function processUploadedFile() {
  if (!uploadedFile.value) {
    toast.add({ title: 'Archivo faltante', description: 'Por favor arrastra o selecciona un archivo primero.', color: 'warning' })
    return
  }

  ocrLoading.value = true
  const formData = new FormData()
  formData.append('file', uploadedFile.value)

  try {
    const data = await $fetch(`${apiBase}/procesar-pdf`, {
      method: 'POST',
      body: formData
    })

    if (data.es_base_calcinada) contexts.value.pdf = { base: 'calcinada', base_trazas: 'calcinada', convertir: true, estimar_loi: true, loi: null }

    ocrResult.value = {
      datos: {
        muestra_id: data.datos.muestra_id || '',
        archivo_fuente: uploadedFileName.value,
        originales: data.datos.originales || [],
        metadatos: data.datos.metadatos || {},
        texto_reporte: data.datos.texto_reporte || data.texto_crudo || '',
        caco3: data.datos.caco3 ?? null,
        cao: data.datos.cao ?? null,
        mgo: data.datos.mgo ?? null,
        sio2: data.datos.sio2 ?? null,
        fe2o3: data.datos.fe2o3 ?? null,
        al2o3: data.datos.al2o3 ?? null,
        so3: data.datos.so3 ?? null,
        na2o: data.datos.na2o ?? null,
        k2o: data.datos.k2o ?? null,
        p2o5: data.datos.p2o5 ?? null,
        pb: data.datos.pb ?? null,
        cd: data.datos.cd ?? null,
        as_ppm: data.datos.as_ppm ?? null,
        drx: null,
        petrografia: null
      },
      extras: {
        pn: null, blancura: null, tamano_particula: null, humedad: null,
        cao_disponible: null, cao_reactivo: null, resistencia: null, absorcion: null
      },
      avisos: data.avisos || []
    }
    uploadedFile.value = null
    uploadedFileName.value = ''
    toast.add({ title: 'Extracción completada', description: 'Revisa y ajusta los valores antes de guardar.', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Error de Extracción', description: e.data?.statusMessage || e.data?.detail || e.statusMessage || 'No se pudo leer el PDF. Asegúrate de subir el reporte de Sample Results.', color: 'error' })
  } finally {
    ocrLoading.value = false
  }
}

async function saveEvaluation(payload) {
  evalLoading.value = true
  try {
    const bodyPayload = {
      id_muestra: payload.muestra_id,
      caco3: nullable(payload.caco3),
      cao: nullable(payload.cao),
      mgo: nullable(payload.mgo),
      sio2: nullable(payload.sio2),
      fe2o3: nullable(payload.fe2o3),
      al2o3: nullable(payload.al2o3),
      so3: nullable(payload.so3),
      na2o: nullable(payload.na2o),
      k2o: nullable(payload.k2o),
      p2o5: nullable(payload.p2o5),
      pb: nullable(payload.pb),
      cd: nullable(payload.cd),
      as_ppm: nullable(payload.as_ppm),
      drx: payload.drx || null,
      petrografia: payload.petrografia || null,
      extras: Object.fromEntries(Object.entries(ocrResult.value?.extras || {}).map(([key, value]) => [key, nullable(value)])),
      archivo_fuente: payload.archivo_fuente || 'PDF Upload',
      contexto: { ...evaluationContext('pdf', payload.originales), texto_reporte: payload.texto_reporte },
      guardar_db: true
    }

    const saved = await $fetch(`${apiBase}/evaluar`, {
      method: 'POST',
      body: bodyPayload
    })

    toast.add({ title: 'Muestra Registrada', description: `La muestra "${payload.muestra_id}" se guardó en SQLite exitosamente.`, color: 'success' })
    viewSampleDetails(saved)
    clearUploadedFile()
    contexts.value.pdf = newContext()
    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Guardado', description: e.data?.statusMessage || e.data?.detail || e.statusMessage || 'No se pudo calcular/guardar la muestra.', color: 'error' })
  } finally {
    evalLoading.value = false
  }
}

// Manual Form Submit
async function submitManualForm() {
  if (!manualForm.value.id_muestra) {
    toast.add({ title: 'ID faltante', description: 'Por favor asigne un ID único a la muestra.', color: 'warning' })
    return
  }

  evalLoading.value = true
  try {
    const cleanExtras = Object.fromEntries(Object.entries(manualForm.value.extras).map(([key, value]) => [key, nullable(value)]))

    const saved = await $fetch(`${apiBase}/evaluar`, {
      method: 'POST',
      body: {
        id_muestra: manualForm.value.id_muestra,
        caco3: nullable(manualForm.value.caco3),
        cao: nullable(manualForm.value.cao),
        mgo: nullable(manualForm.value.mgo),
        sio2: nullable(manualForm.value.sio2),
        fe2o3: nullable(manualForm.value.fe2o3),
        al2o3: nullable(manualForm.value.al2o3),
        so3: nullable(manualForm.value.so3),
        na2o: nullable(manualForm.value.na2o),
        k2o: nullable(manualForm.value.k2o),
        p2o5: nullable(manualForm.value.p2o5),
        pb: nullable(manualForm.value.pb),
        cd: nullable(manualForm.value.cd),
        as_ppm: nullable(manualForm.value.as_ppm),
        drx: nullable(manualForm.value.drx),
        petrografia: nullable(manualForm.value.petrografia),
        extras: cleanExtras,
        archivo_fuente: 'Formulario manual',
        contexto: evaluationContext('manual'),
        guardar_db: true
      }
    })

    toast.add({ title: 'Muestra Registrada', description: `Muestra "${manualForm.value.id_muestra}" evaluada y registrada con éxito.`, color: 'success' })

    viewSampleDetails(saved)
    contexts.value.manual = newContext()
    // Reset form
    manualForm.value = {
      id_muestra: '', caco3: null, cao: null, mgo: null, sio2: null, fe2o3: null, al2o3: null, so3: null,
      na2o: null, k2o: null, p2o5: null, pb: null, cd: null, as_ppm: null, drx: null, petrografia: null,
      extras: { pn: null, blancura: null, tamano_particula: null, humedad: null, cao_disponible: null, cao_reactivo: null, resistencia: null, absorcion: null }
    }

    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Guardado', description: e.data?.statusMessage || e.data?.detail || e.statusMessage || 'No se pudo realizar la evaluación.', color: 'error' })
  } finally {
    evalLoading.value = false
  }
}

// Batch Files
function handleBatchFile(event) {
  const file = event.target.files[0]
  if (file) {
    batchFile.value = file
    batchFileName.value = file.name
  }
}

async function submitBatchFile() {
  if (!batchFile.value) return
  batchLoading.value = true
  const formData = new FormData()
  formData.append('file', batchFile.value)
  formData.append('contexto', JSON.stringify(evaluationContext('batch')))

  try {
    const data = await $fetch(`${apiBase}/procesar-lote`, {
      method: 'POST',
      body: formData
    })
    toast.add({ title: 'Carga Masiva Exitosa', description: `Se procesaron e insertaron ${data.count} muestras exitosamente.`, color: 'success' })
    contexts.value.batch = newContext()
    batchFile.value = null
    batchFileName.value = ''
    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Lote', description: e.data?.statusMessage || e.data?.detail || e.statusMessage || 'No se pudo procesar el archivo por lotes.', color: 'error' })
  } finally {
    batchLoading.value = false
  }
}

// Visualizer details
function viewSampleDetails(sample) {
  selectedSample.value = sample
  evidenceFile.value = null
  evidenceConfirmed.value = false
  replaceEvidence.value = false
  drawerOpen.value = true
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
    fetchHistorial()
  } catch (e) {
    toast.add({ title: 'Error de Eliminación', description: 'No se pudo borrar el registro.', color: 'error' })
  } finally {
    deleteLoading.value = false
    deleteModalOpen.value = false
    sampleToDelete.value = ''
  }
}

const chemicalFields = [
  { key: 'caco3', label: 'CaCO₃', unit: '%' }, { key: 'cao', label: 'CaO', unit: '%' },
  { key: 'mgo', label: 'MgO', unit: '%' }, { key: 'sio2', label: 'SiO₂', unit: '%' },
  { key: 'fe2o3', label: 'Fe₂O₃', unit: '%' }, { key: 'al2o3', label: 'Al₂O₃', unit: '%' },
  { key: 'so3', label: 'SO₃', unit: '%' }, { key: 'na2o', label: 'Na₂O', unit: '%' },
  { key: 'k2o', label: 'K₂O', unit: '%' }, { key: 'p2o5', label: 'P₂O₅', unit: '%' },
  { key: 'pb', label: 'Pb', unit: 'ppm' }, { key: 'cd', label: 'Cd', unit: 'ppm' },
  { key: 'as_ppm', label: 'As', unit: 'ppm' }, { key: 'loi', label: 'LOI', unit: '%' }
]
function nullable(value) { return value == null || value === '' ? null : value }
function showNumber(value, unit = '') { return value == null || value === '' ? 'Sin dato' : `${typeof value === 'number' ? Number(value.toPrecision(10)) : value}${unit ? ` ${unit}` : ''}` }
function summaryText(sample) {
  const r = sample?.resumen
  return r ? `${r.aptos} cumplen · ${r.no_aptos} incumplen · ${r.pendientes} requieren ensayos` : 'Resultado no disponible'
}
function chemicalText(text) {
  const formulas = { CaCO3: 'CaCO₃', MgCO3: 'MgCO₃', SiO2: 'SiO₂', Fe2O3: 'Fe₂O₃', Al2O3: 'Al₂O₃', Na2O: 'Na₂O', K2O: 'K₂O', P2O5: 'P₂O₅', SO3: 'SO₃', H2O: 'H₂O', 'Ca(OH)2': 'Ca(OH)₂' }
  return String(text ?? '').replace(/CaCO3|MgCO3|SiO2|Fe2O3|Al2O3|Na2O|K2O|P2O5|SO3|H2O|Ca\(OH\)2/g, formula => formulas[formula])
}
const evidenceFile = ref(null)
const evidenceConfirmed = ref(false)
const replaceEvidence = ref(false)
const evidenceLoading = ref(false)
function selectEvidence(event) {
  const file = event.target.files[0]
  evidenceFile.value = null
  evidenceConfirmed.value = false
  replaceEvidence.value = false
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size === 0 || file.size > 10 * 1024 * 1024) {
    toast.add({ title: 'Evidencia inválida', description: 'Selecciona un PDF no vacío de hasta 10 MiB.', color: 'error' })
    event.target.value = ''
    return
  }
  evidenceFile.value = file
  event.target.value = ''
}
async function uploadEvidence() {
  const sample = selectedSample.value
  if (!sample || !evidenceFile.value || !evidenceConfirmed.value || (sample.evidencia && !replaceEvidence.value)) return
  evidenceLoading.value = true
  const body = new FormData()
  body.append('file', evidenceFile.value)
  body.append('confirmacion', 'true')
  body.append('reemplazar', String(replaceEvidence.value))
  try {
    const result = await $fetch(`${apiBase}/historial/${encodeURIComponent(sample.id_muestra)}/evidencia`, { method: 'POST', body })
    sample.evidencia = result.evidencia || result
    evidenceFile.value = null
    evidenceConfirmed.value = false
    replaceEvidence.value = false
    toast.add({ title: 'Evidencia guardada', color: 'success' })
    fetchHistorial()
  } catch (e) {
    toast.add({ title: 'No se pudo adjuntar', description: e.data?.statusMessage || e.data?.detail || e.statusMessage || 'La muestra sigue guardada. Puedes reintentar el adjunto.', color: 'error' })
  } finally { evidenceLoading.value = false }
}

// Download Excel
function downloadExcel() {
  window.open(`${apiBase}/exportar-excel`, '_blank')
}
</script>
