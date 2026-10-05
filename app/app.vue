<template>
  <UApp>
    <div v-if="sessionPending" class="min-h-dvh bg-slate-50 flex items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-emerald-600" />
    </div>
    <div v-else-if="!session" class="min-h-dvh grid md:grid-cols-2 bg-white">
      <section class="relative hidden md:flex flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white">
        <img src="/logo.svg" alt="" class="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] opacity-10 rotate-12">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="" class="size-10">
          <span class="text-xl font-bold tracking-tight">Calcita</span>
        </div>
        <div class="relative max-w-md space-y-4">
          <h2 class="text-4xl font-bold leading-tight tracking-tight">De la muestra al mercado.</h2>
          <p class="text-slate-300">FRX, DRX, petrografía y propiedades térmicas en un solo lugar, con informes que dicen para qué sirve cada caliza.</p>
        </div>
        <p class="text-xs text-slate-500">Caracterización y valorización de calizas</p>
      </section>
      <div class="flex items-center justify-center px-6 py-12 bg-slate-50 md:bg-white">
        <form class="w-full max-w-sm space-y-5" @submit.prevent="handleLogin">
          <div class="space-y-2">
            <img src="/logo.svg" alt="" class="size-12 md:hidden">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">Bienvenido</h1>
            <p class="text-sm text-slate-500">Ingresa con tu cuenta de Calcita.</p>
          </div>
          <UFormField label="Correo"><UInput v-model="loginForm.email" type="email" autocomplete="username" required size="lg" class="w-full" icon="i-lucide-mail" /></UFormField>
          <UFormField label="Contraseña"><UInput v-model="loginForm.password" type="password" autocomplete="current-password" required size="lg" class="w-full" icon="i-lucide-lock" /></UFormField>
          <p v-if="loginError" class="text-sm text-rose-600">{{ loginError }}</p>
          <UButton type="submit" block size="lg" color="success" :loading="loginLoading">Ingresar</UButton>
        </form>
      </div>
    </div>
    <div v-else class="flex min-h-dvh bg-slate-50 text-slate-800">
    <SidebarNav :active-tab="activeTab" :can-configure="canConfigure" @navigate="irA" />
    <BottomTabBar :active-tab="activeTab" :can-configure="canConfigure" @navigate="irA" />

    <main class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 pt-[env(safe-area-inset-top)] md:static md:px-8">
        <div class="flex h-14 min-w-0 items-center gap-1 md:h-16 md:gap-2">
          <UButton v-if="muestraEnEdicion && activeTab === 'cargar'" class="md:hidden" variant="ghost" color="neutral" icon="i-heroicons-arrow-left" aria-label="Volver al detalle" @click="cancelarEdicion" />
          <img src="/logo.svg" alt="" class="size-7 shrink-0 md:hidden" :class="muestraEnEdicion && activeTab === 'cargar' && 'hidden'">
          <h2 class="truncate text-base font-bold text-slate-800 md:text-xl">{{ pageTitle }}</h2>
          <span class="hidden shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-600 sm:inline">Local DB (SQLite)</span>
        </div>
        <div class="flex shrink-0 items-center gap-4">
          <span class="hidden text-sm text-slate-500 lg:inline">Evaluación de usos industriales</span>
          <UButton variant="ghost" color="neutral" icon="i-lucide-log-out" size="sm" aria-label="Cerrar sesión" @click="handleLogout"><span class="hidden sm:inline">Salir</span></UButton>
        </div>
      </header>

      <!-- Content Views -->
      <div class="mx-auto w-full max-w-7xl flex-1 px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 md:p-6 lg:p-8">

        <DashboardView v-if="activeTab === 'dashboard'" :samples="samples" :loading="historyLoading" :error="historyError" :summary-text="summaryText" @navigate="target => { activeTab = target === 'historial' ? 'historial' : 'cargar'; }" @export="downloadExcel" @open-sample="viewSampleDetails" @retry="fetchHistorial" />


        <div v-show="activeTab === 'cargar'">
          <CargarMuestra v-if="!muestraEnEdicion" :api-base="apiBase" :samples="samples" :chemical-fields="chemicalFields" :base-options="baseOptions" :chemical-text="chemicalText" @saved="muestraGuardada" />
          <CargarMuestra v-else :key="muestraEnEdicion.id_muestra" :muestra="muestraEnEdicion" :api-base="apiBase" :samples="samples" :chemical-fields="chemicalFields" :base-options="baseOptions" :chemical-text="chemicalText" @saved="muestraGuardada" @cancel="cancelarEdicion" />
        </div>

        <HistorialView v-if="activeTab === 'historial'" v-model:search-query="searchQuery" v-model:filter-status="filterStatus" :samples="filteredSamples" :loading="historyLoading" :error="historyError" @export="downloadExcel" @open-sample="viewSampleDetails" @delete-sample="confirmDeleteSample" @retry="fetchHistorial" />

        <ConfiguracionIaView v-if="activeTab === 'configuracion'" />

      </div>
    </main>

    <SampleDetailDrawer v-model:open="drawerOpen" :sample="selectedSample" @edit="editarMuestra(selectedSample)">
      <DetalleMuestra :sample="selectedSample" :api-base="apiBase" :chemical-fields="chemicalFields" :chemical-text="chemicalText" :file="evidenceFile" :confirmed="evidenceConfirmed" :replace="replaceEvidence" :loading="evidenceLoading" @select-evidence="selectEvidence" @update:confirmed="evidenceConfirmed = $event" @update:replace="replaceEvidence = $event" @upload-evidence="uploadEvidence" />
    </SampleDetailDrawer>

    <!-- CONFIRM DELETE DIALOG -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6 space-y-4 bg-white rounded-lg">
          <h3 class="font-bold text-lg text-slate-900">¿Eliminar esta muestra?</h3>
          <p class="text-sm text-slate-600">Se eliminará de forma permanente la muestra «{{ sampleToDelete }}» con todo lo asociado: datos de FRX, DRX, petrografía y térmicas, fotos, PDF adjuntos e informes IA. No se puede deshacer.</p>
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
const canConfigure = ref(false)
watch(session, async (value) => {
  canConfigure.value = false
  if (!value) return
  try { await $fetch('/api/configuracion-ia'); canConfigure.value = true } catch { /* solo el administrador ve esta sección */ }
}, { immediate: true })
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
function irA({ tab }) {
  activeTab.value = tab
  if (tab === 'cargar') muestraEnEdicion.value = null
  window.scrollTo({ top: 0 })
}
const muestraEnEdicion = ref(null)
function editarMuestra(sample) {
  muestraEnEdicion.value = sample
  drawerOpen.value = false
  activeTab.value = 'cargar'
}
function cancelarEdicion() {
  const sample = muestraEnEdicion.value
  muestraEnEdicion.value = null
  activeTab.value = 'historial'
  viewSampleDetails(sample)
}
async function muestraGuardada(saved) {
  muestraEnEdicion.value = null
  await fetchHistorial()
  viewSampleDetails(samples.value.find(s => s.id_muestra === saved.id_muestra) || saved)
  activeTab.value = 'historial'
}
const pageTitle = computed(() => activeTab.value === 'cargar' && muestraEnEdicion.value
  ? `Editar muestra ${muestraEnEdicion.value.id_muestra}`
  : ({ dashboard: 'Dashboard', cargar: 'Cargar muestra', historial: 'Historial de muestras', configuracion: 'Configuración de IA' }[activeTab.value] || activeTab.value))


// Data State
const samples = ref([])
const historyLoading = ref(false)
const historyError = ref('')
const searchQuery = ref('')
const filterStatus = ref('Todos')

// File processing state
const baseOptions = [{ label: 'Automática', value: 'desconocida' }, { label: 'Seca', value: 'seca' }, { label: 'Calcinada', value: 'calcinada' }]
// Manual Form State

// Evaluation loading
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
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = [s.id_muestra, s.direccion_muestreo, s.coordenadas_muestreo].some(v => String(v || '').toLowerCase().includes(q))
    const matchesStatus = filterStatus.value === 'Todos' ||
      (filterStatus.value === 'Con usos aptos' && s.resumen?.aptos > 0) ||
      (filterStatus.value === 'Con incumplimientos' && s.resumen?.no_aptos > 0) ||
      (filterStatus.value === 'Con ensayos pendientes' && s.resumen?.pendientes > 0) ||
      (filterStatus.value === 'Sin informe integral' && !s.informe_integral_estado) ||
      (filterStatus.value === 'Históricos' && s.version_evaluacion !== 2)
    return matchesSearch && matchesStatus
  })
})

watch(session, (actual, previo) => {
  if (actual && !previo) fetchHistorial()
}, { immediate: true })

// Methods
async function fetchHistorial() {
  historyLoading.value = true
  historyError.value = ''
  try {
    const data = await $fetch(`${apiBase}/historial`)
    samples.value = data || []
    if (selectedSample.value) selectedSample.value = samples.value.find(s => s.id_muestra === selectedSample.value.id_muestra) || selectedSample.value
  } catch (e) {
    historyError.value = 'No se pudieron cargar las muestras. Revisa la conexión e intenta de nuevo.'
    toast.add({
      title: 'Error de Red',
      description: 'No se pudo conectar con la API. Verifica que el servidor esté corriendo.',
      color: 'error'
    })
  } finally {
    historyLoading.value = false
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
