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

        <!-- DASHBOARD VIEW -->
        <div v-if="activeTab === 'dashboard'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <UCard class="shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500">Total Muestras</p>
                  <p class="text-3xl font-bold text-slate-900 mt-1">{{ samples.length }}</p>
                </div>
                <div class="p-3 bg-blue-50 text-blue-600 rounded-full">
                  <UIcon name="i-heroicons-document-text" class="w-6 h-6" />
                </div>
              </div>
            </UCard>

            <UCard class="shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500">Muestras con usos que cumplen</p>
                  <p class="text-3xl font-bold text-emerald-600 mt-1">{{ samples.filter(s => s.resumen?.aptos > 0).length }}</p>
                </div>
                <div class="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
                </div>
              </div>
            </UCard>

            <UCard class="shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500">Muestras con incumplimientos</p>
                  <p class="text-3xl font-bold text-rose-600 mt-1">{{ samples.filter(s => s.resumen?.no_aptos > 0).length }}</p>
                </div>
                <div class="p-3 bg-rose-50 text-rose-600 rounded-full">
                  <UIcon name="i-heroicons-x-circle" class="w-6 h-6" />
                </div>
              </div>
            </UCard>

            <UCard class="shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium opacity-90">Muestras con ensayos pendientes</p>
                  <p class="text-3xl font-bold mt-1">
                    {{ samples.filter(s => s.resumen?.pendientes > 0).length }}
                  </p>
                </div>
                <div class="p-3 bg-white/10 text-white rounded-full">
                  <UIcon name="i-heroicons-presentation-chart-line" class="w-6 h-6" />
                </div>
              </div>
            </UCard>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UCard class="shadow-sm">
              <template #header>
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                  <UIcon name="i-heroicons-bolt" class="text-emerald-500 w-5 h-5" />
                  Acceso Rápido
                </h3>
              </template>
              <p class="text-sm text-slate-600 mb-4">Empieza evaluando una nueva muestra ingresando sus componentes químicos o cargando un archivo XRF.</p>
              <div class="flex gap-3">
                <UButton color="success" @click="activeTab = 'evaluar'; subTab = 'manual'">
                  Entrada Manual
                </UButton>
                <UButton color="neutral" variant="soft" @click="activeTab = 'evaluar'; subTab = 'pdf'">
                  Subir PDF
                </UButton>
              </div>
            </UCard>

            <UCard class="shadow-sm">
              <template #header>
                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-down-tray" class="text-emerald-500 w-5 h-5" />
                  Descargar Base de Datos
                </h3>
              </template>
              <p class="text-sm text-slate-600 mb-4">Descarga el archivo Excel estructurado con todas las muestras registradas e históricos de dictámenes.</p>
              <UButton color="success" variant="outline" icon="i-heroicons-document-arrow-down" @click="downloadExcel">
                Descargar BaseDatos_Calizas.xlsx
              </UButton>
            </UCard>
          </div>

          <!-- Latest Samples -->
          <UCard class="shadow-sm">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-slate-800">Muestras Recientes</h3>
                <UButton variant="link" color="success" @click="activeTab = 'historial'">Ver todo</UButton>
              </div>
            </template>

            <div v-if="samples.length === 0" class="p-8 text-center text-slate-400">
              No hay muestras registradas en la base de datos todavía.
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600 border-collapse">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                    <th class="py-3 px-4">ID Muestra</th>
                    <th class="py-3 px-4">CaCO₃ (%)</th>
                    <th class="py-3 px-4">CaO (%)</th>
                    <th class="py-3 px-4">SiO₂ (%)</th>

                    <th class="py-3 px-4">Resultados por uso</th>
                    <th class="py-3 px-4">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="s in samples.slice(0, 5)" :key="s.id_muestra" class="hover:bg-slate-50/80 transition-colors cursor-pointer" @click="viewSampleDetails(s)">
                    <td class="py-3 px-4 font-bold text-slate-900">{{ s.id_muestra }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.caco3, '%') }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.cao, '%') }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.sio2, '%') }}</td>

                    <td class="py-3 px-4">
                      <span>{{ summaryText(s) }}</span><span v-if="s.version_evaluacion !== 2" class="block text-xs text-amber-700">Histórico · evaluación anterior</span>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-400">{{ s.fecha_registro }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </div>

        <!-- EVALUAR VIEW -->
        <div v-if="activeTab === 'evaluar'" class="space-y-6">
          <!-- Sub Tabs Header -->
          <div class="flex gap-4 border-b border-slate-200 pb-px">
            <button
              v-for="tab in [{id: 'pdf', label: '📄 Procesar PDF'}, {id: 'manual', label: '✍️ Entrada Manual'}, {id: 'batch', label: '📑 Carga por Lote'}]"
              :key="tab.id"
              @click="subTab = tab.id"
              :class="[
                'pb-3 text-sm font-semibold border-b-2 transition-colors px-1',
                subTab === tab.id ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              ]"
            >
              {{ tab.label }}
            </button>
          </div>

          <section class="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <h3 class="font-semibold">Base de los resultados {{ subTab === 'batch' ? '(común a todas las filas)' : '' }}</h3>
            <p class="text-sm text-slate-600">Confirma la base con el informe del laboratorio. Un campo vacío significa “Sin dato”. Los valores originales se conservan y la conversión se aplica al evaluar.</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label class="text-sm">Base analítica
                <USelect v-model="analysisOptions.base" :items="baseOptions" color="success" class="mt-1 w-full" />
              </label>
              <label class="text-sm">Base de las trazas (ppm)
                <USelect v-model="analysisOptions.base_trazas" :items="baseOptions" color="success" class="mt-1 w-full" />
              </label>
              <label class="text-sm">LOI medido (%)
                <UInput v-model.number="analysisOptions.loi" type="number" min="0" max="100" step="any" placeholder="Sin dato" />
              </label>
            </div>
            <UCheckbox v-model="analysisOptions.convertir" color="success" :disabled="analysisOptions.base !== 'calcinada'" label="Convertir de base calcinada a seca" />
            <UCheckbox v-model="analysisOptions.estimar_loi" color="success" :disabled="analysisOptions.base !== 'calcinada' || !analysisOptions.convertir || (analysisOptions.loi !== null && analysisOptions.loi !== '')" label="Estimar LOI si falta (informativo; no sustituye un ensayo)" />
          </section>

          <!-- Sub Tab: PDF/Imagen -->
          <div v-if="subTab === 'pdf'" class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="md:col-span-1 space-y-6">
              <UCard class="shadow-sm">
                <template #header>
                  <h3 class="font-bold text-slate-800">Procesar Archivo XRF</h3>
                </template>

                <div class="space-y-4">
                  <!-- File uploader -->
                  <div class="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-slate-50/50">
                    <input :key="uploadedFileName" type="file" :disabled="ocrLoading" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,application/pdf" aria-label="PDF de resultados XRF" @change="handleFileUpload" />
                    <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-slate-400 mb-2" />
                    <p class="text-sm font-semibold text-slate-700">Arrastra o selecciona un archivo</p>
                    <p class="text-xs text-slate-500 mt-1">PDF de resultados del laboratorio (XRF)</p>
                  </div>

                  <div v-if="uploadedFileName" class="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2 truncate">
                      <UIcon name="i-heroicons-document-check" class="text-emerald-500 w-5 h-5 shrink-0" />
                      <span class="truncate font-medium text-slate-700">{{ uploadedFileName }}</span>
                    </div>
                    <button class="text-rose-500" :disabled="ocrLoading" aria-label="Quitar PDF" @click="clearUploadedFile">
                      <UIcon name="i-heroicons-trash" />
                    </button>
                  </div>

                  <UButton block color="success" :loading="ocrLoading" @click="processUploadedFile">
                    Extraer datos
                  </UButton>
                </div>
              </UCard>
            </div>

            <!-- Preview / Form editable posterior al OCR/PDF -->
            <div class="md:col-span-2">
              <UCard v-if="ocrResult" class="shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-800">Resultados de la Extracción</h3>
                    <UBadge color="success" variant="subtle">Extracción Exitosa</UBadge>
                  </div>
                </template>

                <!-- Warnings/Avisos -->
                <div v-if="ocrResult.avisos && ocrResult.avisos.length > 0" class="mb-6 space-y-2">
                  <div v-for="aviso in ocrResult.avisos" :key="aviso" class="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded text-sm flex gap-2 items-center">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{{ chemicalText(aviso) }}</span>
                  </div>
                </div>

                <section class="mb-6 text-sm space-y-2">
                  <h4 class="font-semibold">Datos extraídos al formulario · {{ ocrResult.datos.originales.length }} componentes</h4>
                  <p>Esta es la composición completa encontrada en el PDF. Los componentes usados por la clasificación también aparecen como campos editables debajo.</p>
                  <table class="w-full text-left mt-2"><thead><tr><th>Compuesto</th><th>Lectura</th><th>Unidad</th></tr></thead><tbody>
                    <tr v-for="(o, i) in ocrResult.datos.originales" :key="i"><td>{{ chemicalText(o.compuesto) }}</td><td>{{ o.texto }}</td><td>{{ o.unidad }}</td></tr>
                  </tbody></table>
                </section>
                <details v-if="Object.keys(ocrResult.datos.metadatos || {}).length" class="mb-4 text-sm">
                  <summary class="font-semibold cursor-pointer">Información del ensayo</summary>
                  <dl class="mt-2 space-y-1"><div v-for="(valor, campo) in ocrResult.datos.metadatos" :key="campo"><dt class="font-medium">{{ campo }}</dt><dd>{{ valor }}</dd></div></dl>
                </details>
                <!-- Form to edit before save -->
                <form @submit.prevent="saveEvaluation(ocrResult.datos)" class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AppField v-model="ocrResult.datos.muestra_id" label="ID Muestra *" required color="success" />
                    <AppField v-model.number="ocrResult.datos.caco3" label="CaCO₃ (%)" type="number" step="any" min="0" max="100" color="success" />
                    <AppField v-model.number="ocrResult.datos.cao" label="CaO (%)" type="number" step="any" min="0" max="100" color="success" />
                    <AppField v-model.number="ocrResult.datos.mgo" label="MgO (%)" type="number" step="any" min="0" max="100" color="success" />
                    <AppField v-model.number="ocrResult.datos.sio2" label="SiO₂ (%)" type="number" step="any" min="0" max="100" color="success" />
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fe₂O₃ (%)</label>
                      <UInput v-model.number="ocrResult.datos.fe2o3" type="number" step="any" min="0" max="100" color="success" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Al₂O₃ (%)</label>
                      <UInput v-model.number="ocrResult.datos.al2o3" type="number" step="any" min="0" max="100" color="success" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">SO₃ (%)</label>
                      <UInput v-model.number="ocrResult.datos.so3" type="number" step="any" min="0" max="100" color="success" />
                    </div>
                    <div v-for="f in chemicalFields.filter(f => ['na2o', 'k2o', 'p2o5', 'pb', 'cd', 'as_ppm'].includes(f.key))" :key="f.key">
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">{{ f.label }} ({{ f.unit }})</label>
                      <UInput v-model.number="ocrResult.datos[f.key]" type="number" step="any" min="0" :max="f.unit === '%' ? 100 : undefined" placeholder="Sin dato" color="success" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">DRX Dominante</label>
                      <USelect v-model="ocrResult.datos.drx" :items="drxOptions" color="success" class="w-full" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Petrografía Dominante</label>
                      <USelect v-model="ocrResult.datos.petrografia" :items="petrografiaOptions" color="success" class="w-full" />
                    </div>
                  </div>

                  <!-- Collapsible Optional tests -->
                  <UAccordion
                    color="neutral"
                    variant="soft"
                    :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', slot: 'fields' }]"
                  >
                    <template #fields>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-slate-100 rounded-b-lg">
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Poder Neutralizante PN (%)</label>
                          <UInput v-model.number="ocrResult.extras.pn" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Blancura (%)</label>
                          <UInput v-model.number="ocrResult.extras.blancura" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Tamaño Partícula (µm)</label>
                          <UInput v-model.number="ocrResult.extras.tamano_particula" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Humedad (%)</label>
                          <UInput v-model.number="ocrResult.extras.humedad" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Disponible (%)</label>
                          <UInput v-model.number="ocrResult.extras.cao_disponible" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Reactivo (%)</label>
                          <UInput v-model.number="ocrResult.extras.cao_reactivo" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Resistencia (MPa)</label>
                          <UInput v-model.number="ocrResult.extras.resistencia" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Absorción (%)</label>
                          <UInput v-model.number="ocrResult.extras.absorcion" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                        </div>
                      </div>
                    </template>
                  </UAccordion>

                  <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                    <UButton color="neutral" variant="ghost" @click="clearOcr">Limpiar</UButton>
                    <UButton type="submit" color="success" icon="i-heroicons-circle-stack" :loading="evalLoading">
                      Evaluar y Registrar Muestra
                    </UButton>
                  </div>
                </form>
              </UCard>

              <!-- Empty preview state -->
              <div v-else class="h-full border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-white min-h-[350px]">
                <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-slate-300 mb-2" />
                <h4 class="font-bold text-slate-700">Previsualización de datos</h4>
                <p class="text-sm text-slate-500 max-w-sm mt-1">Sube un archivo PDF de reporte XRF. Los datos se extraerán, se previsualizarán en un formulario editable y podrás corregirlos antes de guardarlos.</p>
              </div>
            </div>
          </div>

          <!-- Sub Tab: Manual Form -->
          <div v-if="subTab === 'manual'" class="max-w-5xl mx-auto">
            <UCard class="shadow-sm">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-pencil-square" class="text-emerald-500 w-5 h-5" />
                  <h3 class="font-bold text-slate-800">Formulario Químico Completo</h3>
                </div>
              </template>

              <form @submit.prevent="submitManualForm" class="space-y-6">
                <!-- Principal Inputs -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">ID Muestra *</label>
                    <UInput v-model="manualForm.id_muestra" required placeholder="Ej: CAR-001" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaCO₃ (%)</label>
                    <UInput v-model.number="manualForm.caco3" type="number" step="any" min="0" max="100" placeholder="Ej: 94.8" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaO (%)</label>
                    <UInput v-model.number="manualForm.cao" type="number" step="any" min="0" max="100" placeholder="Ej: 54.1" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">MgO (%)</label>
                    <UInput v-model.number="manualForm.mgo" type="number" step="any" min="0" max="100" placeholder="Ej: 0.8" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">SiO₂ (%)</label>
                    <UInput v-model.number="manualForm.sio2" type="number" step="any" min="0" max="100" placeholder="Ej: 6.4" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fe₂O₃ (%)</label>
                    <UInput v-model.number="manualForm.fe2o3" type="number" step="any" min="0" max="100" placeholder="Ej: 1.9" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Al₂O₃ (%)</label>
                    <UInput v-model.number="manualForm.al2o3" type="number" step="any" min="0" max="100" placeholder="Ej: 2.8" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">SO₃ (%)</label>
                    <UInput v-model.number="manualForm.so3" type="number" step="any" min="0" max="100" placeholder="Ej: 2.4" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Na₂O (%)</label>
                    <UInput v-model.number="manualForm.na2o" type="number" step="any" min="0" max="100" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">K₂O (%)</label>
                    <UInput v-model.number="manualForm.k2o" type="number" step="any" min="0" max="100" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">P₂O₅ (%)</label>
                    <UInput v-model.number="manualForm.p2o5" type="number" step="any" min="0" max="100" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Plomo - Pb (ppm)</label>
                    <UInput v-model.number="manualForm.pb" type="number" step="any" min="0" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Cadmio - Cd (ppm)</label>
                    <UInput v-model.number="manualForm.cd" type="number" step="any" min="0" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Arsénico - As (ppm)</label>
                    <UInput v-model.number="manualForm.as_ppm" type="number" step="any" min="0" placeholder="Sin dato" color="success" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fase Mineral Dominante (DRX)</label>
                    <USelect v-model="manualForm.drx" :items="drxOptions" color="success" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Textura Dominante (Petrografía)</label>
                    <USelect v-model="manualForm.petrografia" :items="petrografiaOptions" color="success" class="w-full" />
                  </div>
                </div>

                <!-- Accordion for manual extras -->
                <UAccordion
                  color="neutral"
                  variant="soft"
                  :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', slot: 'fields' }]"
                >
                  <template #fields>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-slate-100 rounded-b-lg">
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Poder Neutralizante PN (%)</label>
                        <UInput v-model.number="manualForm.extras.pn" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Blancura (%)</label>
                        <UInput v-model.number="manualForm.extras.blancura" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Tamaño Partícula (µm)</label>
                        <UInput v-model.number="manualForm.extras.tamano_particula" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Humedad (%)</label>
                        <UInput v-model.number="manualForm.extras.humedad" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Disponible (%)</label>
                        <UInput v-model.number="manualForm.extras.cao_disponible" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Reactivo (%)</label>
                        <UInput v-model.number="manualForm.extras.cao_reactivo" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Resistencia (MPa)</label>
                        <UInput v-model.number="manualForm.extras.resistencia" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Absorción (%)</label>
                        <UInput v-model.number="manualForm.extras.absorcion" type="number" step="any" min="0" placeholder="Opcional" color="success" />
                      </div>
                    </div>
                  </template>
                </UAccordion>

                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <UButton type="submit" color="success" icon="i-heroicons-check-circle" :loading="evalLoading">
                    Evaluar y Registrar Muestra
                  </UButton>
                </div>
              </form>
            </UCard>
          </div>

          <!-- Sub Tab: Batch/Lote -->
          <div v-if="subTab === 'batch'" class="max-w-4xl mx-auto space-y-6">
            <UCard class="shadow-sm">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-table-cells" class="text-emerald-500 w-5 h-5" />
                  <h3 class="font-bold text-slate-800">Cargar Archivo por Lote (Excel / CSV)</h3>
                </div>
              </template>

              <div class="space-y-4">
                <div class="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 space-y-2">
                  <p class="font-semibold text-slate-800">Columnas recomendadas en el archivo:</p>
                  <p class="font-mono text-xs bg-white border border-slate-200 p-2 rounded block">
                    ID Muestra, CaCO₃, CaO, MgO, SiO₂, Fe₂O₃, Al₂O₃, SO₃, Na₂O, K₂O
                  </p>
                  <p>La aplicación validará todas las filas y guardará sus evaluaciones con la base seleccionada. Los campos ausentes permanecerán sin dato.</p>
                </div>

                <div class="border-2 border-dashed border-slate-200 rounded-lg p-8 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-slate-50/50">
                  <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="handleBatchFile" />
                  <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-slate-400 mb-2" />
                  <p class="text-sm font-semibold text-slate-700">Arrastra o selecciona tu Excel/CSV</p>
                  <p class="text-xs text-slate-500 mt-1">Soporta formatos .xlsx y .csv</p>
                </div>

                <div v-if="batchFileName" class="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2 truncate">
                    <UIcon name="i-heroicons-document-check" class="text-emerald-500 w-5 h-5 shrink-0" />
                    <span class="truncate font-medium text-slate-700">{{ batchFileName }}</span>
                  </div>
                </div>

                <div class="flex justify-end pt-4">
                  <UButton color="success" :loading="batchLoading" :disabled="!batchFile" @click="submitBatchFile">
                    Procesar y Guardar Lote
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- HISTORIAL VIEW -->
        <div v-if="activeTab === 'historial'" class="space-y-6">
          <UCard class="shadow-sm">
            <template #header>
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 class="font-bold text-slate-800">Registros Históricos</h3>

                <div class="flex flex-wrap items-center gap-3">
                  <!-- Search bar -->
                  <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Buscar ID..." color="success" class="w-64" />

                  <!-- Filter status -->
                  <USelect v-model="filterStatus" :items="['Todos', 'Con usos aptos', 'Con incumplimientos', 'Con ensayos pendientes', 'Históricos']" color="success" class="w-56" />

                  <!-- Export Button -->
                  <UButton color="success" variant="outline" icon="i-heroicons-document-arrow-down" @click="downloadExcel">
                    Excel
                  </UButton>
                </div>
              </div>
            </template>

            <!-- Table of all items -->
            <div v-if="filteredSamples.length === 0" class="p-8 text-center text-slate-400">
              No se encontraron muestras registradas con los filtros seleccionados.
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600 border-collapse">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                    <th class="py-3 px-4">ID Muestra</th>
                    <th class="py-3 px-4">CaCO₃ (%)</th>
                    <th class="py-3 px-4">CaO (%)</th>
                    <th class="py-3 px-4">SiO₂ (%)</th>

                    <th class="py-3 px-4">Resultados por uso</th>
                    <th class="py-3 px-4">Fecha Registro</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="s in filteredSamples" :key="s.id_muestra" class="hover:bg-slate-50/80 transition-colors cursor-pointer" @click="viewSampleDetails(s)">
                    <td class="py-3 px-4 font-bold text-slate-900">{{ s.id_muestra }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.caco3, '%') }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.cao, '%') }}</td>
                    <td class="py-3 px-4">{{ showNumber(s.sio2, '%') }}</td>

                    <td class="py-3 px-4">
                      <span>{{ summaryText(s) }}</span><span v-if="s.version_evaluacion !== 2" class="block text-xs text-amber-700">Histórico · evaluación anterior</span>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-400">{{ s.fecha_registro }}</td>
                    <td class="py-3 px-4 text-right" @click.stop>
                      <div class="flex justify-end gap-1">
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-eye" aria-label="Ver detalle" @click="viewSampleDetails(s)" />
                        <UButton color="error" variant="ghost" icon="i-heroicons-trash" aria-label="Eliminar muestra" @click="confirmDeleteSample(s.id_muestra)" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </div>

      </div>
    </main>

    <SampleDetailDrawer v-model:open="drawerOpen" :sample="selectedSample">
      <div class="space-y-6">
            <div class="p-4 rounded-xl border bg-slate-50 space-y-2">
              <p class="font-semibold">{{ summaryText(selectedSample) }}</p>
              <p v-if="selectedSample?.version_evaluacion !== 2" class="text-sm text-amber-800">Histórico · evaluación anterior. Se conserva sin recalcular. Veredicto anterior: {{ selectedSample?.estado_eval || 'No disponible' }}.</p>
              <p class="text-xs text-slate-600">Cumplimiento de los criterios configurados; no constituye certificación normativa.</p>
            </div>
            <IndustrialProfiles
              :dictamenes="selectedSample?.dictamenes"
              :chemical-text="chemicalText"
              :show-number="showNumber"
            />
            <section class="space-y-3">
              <h4 class="font-bold">Datos del análisis</h4>
              <p class="text-sm">Base declarada: {{ selectedSample?.contexto?.base || 'No registrada' }} · Base de trazas: {{ selectedSample?.contexto?.base_trazas || 'No registrada' }}</p>
              <p v-if="selectedSample?.contexto?.convertir" class="text-sm">Conversión aplicada a base seca. LOI: {{ showNumber(selectedSample.contexto.loi, '%') }}.</p>
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left"><thead><tr><th>Parámetro</th><th>Valor usado</th><th>Procedencia</th></tr></thead><tbody>
                  <tr v-for="f in chemicalFields" :key="f.key" class="border-t border-slate-100"><td class="py-2">{{ f.label }}</td><td>{{ showNumber(selectedSample?.[f.key], f.unit) }}</td><td>{{ selectedSample?.contexto?.procedencia?.[f.key] || 'No registrada' }}</td></tr>
                </tbody></table>
              </div>
              <p class="text-sm">DRX: {{ selectedSample?.drx || 'Sin dato' }} · Petrografía: {{ selectedSample?.petrografia || 'Sin dato' }}</p>
              <OriginalCompositionTable
                :originales="selectedSample?.contexto?.originales"
                :chemical-text="chemicalText"
              />
              <details v-if="Object.keys(selectedSample?.contexto?.metadatos || {}).length" class="text-sm">
                <summary class="font-semibold cursor-pointer">Información del ensayo</summary>
                <dl class="mt-2 space-y-1"><div v-for="(valor, campo) in selectedSample.contexto.metadatos" :key="campo"><dt class="font-medium">{{ campo }}</dt><dd>{{ valor }}</dd></div></dl>
              </details>
              <details v-if="selectedSample?.contexto?.texto_reporte" class="text-sm"><summary class="cursor-pointer">Texto íntegro extraído del informe</summary><pre class="whitespace-pre-wrap text-xs mt-2">{{ selectedSample.contexto.texto_reporte }}</pre></details>
              <p class="text-xs text-slate-600">LSF: {{ showNumber(selectedSample?.lsf) }} · SM: {{ showNumber(selectedSample?.sm) }}. Relaciones calculadas; no determinan por sí solas la aptitud de la roca.</p>
              <p v-if="selectedSample?.version_evaluacion === 2" class="text-xs text-slate-500">Las fases de Bogue no se presentan: corresponden al clínker y no a esta evaluación de roca caliza.</p>
              <details v-else class="text-sm"><summary>Fases históricas de Bogue (sin recalcular)</summary><p>C₃S: {{ showNumber(selectedSample?.c3s, '%') }} · C₂S: {{ showNumber(selectedSample?.c2s, '%') }} · C₃A: {{ showNumber(selectedSample?.c3a, '%') }} · C₄AF: {{ showNumber(selectedSample?.c4af, '%') }}</p></details>
            </section>
            <EvidenceSection
              :sample="selectedSample"
              :file="evidenceFile"
              :confirmed="evidenceConfirmed"
              :replace="replaceEvidence"
              :loading="evidenceLoading"
              :api-base="apiBase"
              @select="selectEvidence"
              @update:confirmed="evidenceConfirmed = $event"
              @update:replace="replaceEvidence = $event"
              @upload="uploadEvidence"
            />
      </div>
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
