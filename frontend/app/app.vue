<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0">
      <div>
        <!-- Logo / Title -->
        <div class="p-6 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <span class="text-3xl">🪨</span>
            <div>
              <h1 class="font-bold text-lg tracking-tight leading-none text-slate-100">Calizas</h1>
              <span class="text-xs text-emerald-400 font-medium">Evaluación Geoquímica</span>
            </div>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="p-4 space-y-1.5">
          <button
            @click="activeTab = 'dashboard'"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            ]"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            @click="activeTab = 'evaluar'"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'evaluar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            ]"
          >
            <UIcon name="i-heroicons-beaker" class="w-5 h-5" />
            <span>Evaluar Muestra</span>
          </button>

          <button
            @click="activeTab = 'historial'"
            :class="[
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'historial' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            ]"
          >
            <UIcon name="i-heroicons-table-cells" class="w-5 h-5" />
            <span>Historial y Base de Datos</span>
          </button>
        </nav>
      </div>

      <!-- Footer / Credits -->
      <div class="p-6 border-t border-slate-800 text-xs text-slate-500">
        <p class="font-semibold text-slate-400">Versión 2.0 (Nuxt 3)</p>
        <p class="mt-1">Normativas ASTM C150 / NTC 321</p>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <!-- Top header bar -->
      <header class="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-bold text-slate-800 capitalize">{{ activeTab }}</h2>
          <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">Local DB (SQLite)</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-slate-500">FastAPI Backend: <b class="text-emerald-600 font-medium">Conectado</b></span>
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
                  <p class="text-sm font-medium text-slate-500">Aptas Cemento</p>
                  <p class="text-3xl font-bold text-emerald-600 mt-1">{{ samples.filter(s => s.estado_eval === 'APTO').length }}</p>
                </div>
                <div class="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                  <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
                </div>
              </div>
            </UCard>

            <UCard class="shadow-sm">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-500">No Aptas Cemento</p>
                  <p class="text-3xl font-bold text-rose-600 mt-1">{{ samples.filter(s => s.estado_eval === 'NO APTO').length }}</p>
                </div>
                <div class="p-3 bg-rose-50 text-rose-600 rounded-full">
                  <UIcon name="i-heroicons-x-circle" class="w-6 h-6" />
                </div>
              </div>
            </UCard>

            <UCard class="shadow-sm bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium opacity-90">Tasa de Aprobación</p>
                  <p class="text-3xl font-bold mt-1">
                    {{ samples.length > 0 ? Math.round((samples.filter(s => s.estado_eval === 'APTO').length / samples.length) * 100) : 0 }}%
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
                <UButton color="emerald" @click="activeTab = 'evaluar'; subTab = 'manual'">
                  Entrada Manual
                </UButton>
                <UButton color="slate" variant="soft" @click="activeTab = 'evaluar'; subTab = 'pdf'">
                  Subir PDF / Imagen
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
              <UButton color="emerald" variant="outline" icon="i-heroicons-document-arrow-down" @click="downloadExcel">
                Descargar BaseDatos_Calizas.xlsx
              </UButton>
            </UCard>
          </div>

          <!-- Latest Samples -->
          <UCard class="shadow-sm">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-slate-800">Muestras Recientes</h3>
                <UButton variant="link" color="emerald" @click="activeTab = 'historial'">Ver todo</UButton>
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
                    <th class="py-3 px-4">CaCO3 (%)</th>
                    <th class="py-3 px-4">CaO (%)</th>
                    <th class="py-3 px-4">SiO2 (%)</th>
                    <th class="py-3 px-4">LSF</th>
                    <th class="py-3 px-4">Veredicto</th>
                    <th class="py-3 px-4">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="s in samples.slice(0, 5)" :key="s.id_muestra" class="hover:bg-slate-50/80 transition-colors cursor-pointer" @click="viewSampleDetails(s)">
                    <td class="py-3 px-4 font-bold text-slate-900">{{ s.id_muestra }}</td>
                    <td class="py-3 px-4">{{ s.caco3 }}%</td>
                    <td class="py-3 px-4">{{ s.cao }}%</td>
                    <td class="py-3 px-4">{{ s.sio2 }}%</td>
                    <td class="py-3 px-4 font-mono">{{ s.lsf?.toFixed(3) }}</td>
                    <td class="py-3 px-4">
                      <span :class="['px-2 py-0.5 rounded-full text-xs font-bold', s.estado_eval === 'APTO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200']">
                        {{ s.estado_eval }}
                      </span>
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
              v-for="tab in [{id: 'pdf', label: '📄 Procesar PDF / Imagen'}, {id: 'manual', label: '✍️ Entrada Manual'}, {id: 'batch', label: '📑 Carga por Lote'}]"
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
                    <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" @change="handleFileUpload" />
                    <UIcon name="i-heroicons-cloud-arrow-up" class="w-10 h-10 text-slate-400 mb-2" />
                    <p class="text-sm font-semibold text-slate-700">Arrastra o selecciona un archivo</p>
                    <p class="text-xs text-slate-500 mt-1">PDF del laboratorio o Imagen (XRF)</p>
                  </div>

                  <div v-if="uploadedFileName" class="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2 truncate">
                      <UIcon name="i-heroicons-document-check" class="text-emerald-500 w-5 h-5 shrink-0" />
                      <span class="truncate font-medium text-slate-700">{{ uploadedFileName }}</span>
                    </div>
                    <button class="text-rose-500" @click="clearUploadedFile">
                      <UIcon name="i-heroicons-trash" />
                    </button>
                  </div>

                  <!-- Extraction Options -->
                  <div class="space-y-3 pt-2">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-slate-700">Conversión a Base Seca</span>
                      <UToggle v-model="pdfOptions.convertir" color="emerald" />
                    </div>
                    <div v-if="pdfOptions.convertir">
                      <label class="text-xs text-slate-500 block mb-1">LOI Medido (%) <span class="text-slate-400">(Dejar 0 para estimar)</span></label>
                      <UInput v-model.number="pdfOptions.loi_manual" type="number" step="0.01" min="0" placeholder="0.0" color="emerald" />
                    </div>
                  </div>

                  <UButton block color="emerald" :loading="ocrLoading" @click="processUploadedFile">
                    Extraer y Evaluar
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
                    <UBadge color="emerald" variant="subtle">Extracción Exitosa</UBadge>
                  </div>
                </template>

                <!-- Warnings/Avisos -->
                <div v-if="ocrResult.avisos && ocrResult.avisos.length > 0" class="mb-6 space-y-2">
                  <div v-for="aviso in ocrResult.avisos" :key="aviso" class="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 rounded text-sm flex gap-2 items-center">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{{ aviso }}</span>
                  </div>
                </div>

                <!-- Form to edit before save -->
                <form @submit.prevent="saveEvaluation(ocrResult.datos)" class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">ID Muestra *</label>
                      <UInput v-model="ocrResult.datos.muestra_id" required color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaCO3 (%)</label>
                      <UInput v-model.number="ocrResult.datos.caco3" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaO (%)</label>
                      <UInput v-model.number="ocrResult.datos.cao" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">MgO (%)</label>
                      <UInput v-model.number="ocrResult.datos.mgo" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">SiO2 (%)</label>
                      <UInput v-model.number="ocrResult.datos.sio2" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fe2O3 (%)</label>
                      <UInput v-model.number="ocrResult.datos.fe2o3" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Al2O3 (%)</label>
                      <UInput v-model.number="ocrResult.datos.al2o3" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">SO3 (%)</label>
                      <UInput v-model.number="ocrResult.datos.so3" type="number" step="0.01" min="0" max="100" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">DRX Dominante</label>
                      <USelect v-model="ocrResult.datos.drx" :options="['Calcita', 'Calcita Magnesiana', 'Dolomita']" color="emerald" />
                    </div>
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-1.5">Petrografía Dominante</label>
                      <USelect v-model="ocrResult.datos.petrografia" :options="['Micrítica de grano fino', 'Esparítica de grano grueso']" color="emerald" />
                    </div>
                  </div>

                  <!-- Collapsible Optional tests -->
                  <UAccordion
                    color="slate"
                    variant="soft"
                    :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', content: 'fields' }]"
                  >
                    <template #item>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-slate-100 rounded-b-lg">
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Poder Neutralizante PN (%)</label>
                          <UInput v-model.number="ocrResult.extras.pn" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Blancura (%)</label>
                          <UInput v-model.number="ocrResult.extras.blancura" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Tamaño Partícula (µm)</label>
                          <UInput v-model.number="ocrResult.extras.tamano_particula" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Humedad (%)</label>
                          <UInput v-model.number="ocrResult.extras.humedad" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Disponible (%)</label>
                          <UInput v-model.number="ocrResult.extras.cao_disponible" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Reactivo (%)</label>
                          <UInput v-model.number="ocrResult.extras.cao_reactivo" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Resistencia (MPa)</label>
                          <UInput v-model.number="ocrResult.extras.resistencia" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-600 mb-1">Absorción (%)</label>
                          <UInput v-model.number="ocrResult.extras.absorcion" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                        </div>
                      </div>
                    </template>
                  </UAccordion>

                  <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                    <UButton color="slate" variant="ghost" @click="clearOcr">Limpiar</UButton>
                    <UButton type="submit" color="emerald" icon="i-heroicons-circle-stack" :loading="evalLoading">
                      Calcular LSF y Registrar Muestra
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
          <div v-if="subTab === 'manual'" class="max-w-4xl mx-auto">
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
                    <UInput v-model="manualForm.id_muestra" required placeholder="Ej: CAR-001" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaCO3 (%)</label>
                    <UInput v-model.number="manualForm.caco3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 94.8" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">CaO (%)</label>
                    <UInput v-model.number="manualForm.cao" type="number" step="0.01" min="0" max="100" placeholder="Ej: 54.1" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">MgO (%)</label>
                    <UInput v-model.number="manualForm.mgo" type="number" step="0.01" min="0" max="100" placeholder="Ej: 0.8" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">SiO2 (%)</label>
                    <UInput v-model.number="manualForm.sio2" type="number" step="0.01" min="0" max="100" placeholder="Ej: 6.4" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fe2O3 (%)</label>
                    <UInput v-model.number="manualForm.fe2o3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 1.9" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Al2O3 (%)</label>
                    <UInput v-model.number="manualForm.al2o3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 2.8" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">SO3 (%)</label>
                    <UInput v-model.number="manualForm.so3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 2.4" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Na2O (%)</label>
                    <UInput v-model.number="manualForm.na2o" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">K2O (%)</label>
                    <UInput v-model.number="manualForm.k2o" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">P2O5 (%)</label>
                    <UInput v-model.number="manualForm.p2o5" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Plomo - Pb (ppm)</label>
                    <UInput v-model.number="manualForm.pb" type="number" step="0.01" min="0" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Cadmio - Cd (ppm)</label>
                    <UInput v-model.number="manualForm.cd" type="number" step="0.01" min="0" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Arsénico - As (ppm)</label>
                    <UInput v-model.number="manualForm.as_ppm" type="number" step="0.01" min="0" placeholder="0.0" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fase Mineral Dominante (DRX)</label>
                    <USelect v-model="manualForm.drx" :options="['Calcita', 'Calcita Magnesiana', 'Dolomita']" color="emerald" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Textura Dominante (Petrografía)</label>
                    <USelect v-model="manualForm.petrografia" :options="['Micrítica de grano fino', 'Esparítica de grano grueso']" color="emerald" />
                  </div>
                </div>

                <!-- Accordion for manual extras -->
                <UAccordion
                  color="slate"
                  variant="soft"
                  :items="[{ label: '🧪 Ensayos adicionales opcionales (Para habilitar más perfiles industriales)', content: 'fields' }]"
                >
                  <template #item>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white border border-slate-100 rounded-b-lg">
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Poder Neutralizante PN (%)</label>
                        <UInput v-model.number="manualForm.extras.pn" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Blancura (%)</label>
                        <UInput v-model.number="manualForm.extras.blancura" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Tamaño Partícula (µm)</label>
                        <UInput v-model.number="manualForm.extras.tamano_particula" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Humedad (%)</label>
                        <UInput v-model.number="manualForm.extras.humedad" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Disponible (%)</label>
                        <UInput v-model.number="manualForm.extras.cao_disponible" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">CaO Reactivo (%)</label>
                        <UInput v-model.number="manualForm.extras.cao_reactivo" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Resistencia (MPa)</label>
                        <UInput v-model.number="manualForm.extras.resistencia" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Absorción (%)</label>
                        <UInput v-model.number="manualForm.extras.absorcion" type="number" step="0.01" min="0" placeholder="Opcional" color="emerald" />
                      </div>
                    </div>
                  </template>
                </UAccordion>

                <div class="flex justify-end gap-3 border-t border-slate-100 pt-6">
                  <UButton type="submit" color="emerald" icon="i-heroicons-check-circle" :loading="evalLoading">
                    Calcular LSF y Evaluar Muestra
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
                    ID Muestra, CaCO3, CaO, MgO, SiO2, Fe2O3, Al2O3, SO3, Na2O, K2O
                  </p>
                  <p>La aplicación procesará cada fila, estimará LOI y módulos de clinker, y guardará todo automáticamente en la base de datos.</p>
                </div>

                <div class="border-2 border-dashed border-slate-200 rounded-lg p-8 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-slate-50/50">
                  <input type="file" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" @change="handleBatchFile" />
                  <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-slate-400 mb-2" />
                  <p class="text-sm font-semibold text-slate-700">Arrastra o selecciona tu Excel/CSV</p>
                  <p class="text-xs text-slate-500 mt-1">Soporta formatos .xlsx, .xls, .csv</p>
                </div>

                <div v-if="batchFileName" class="bg-slate-100 p-3 rounded-lg flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2 truncate">
                    <UIcon name="i-heroicons-document-check" class="text-emerald-500 w-5 h-5 shrink-0" />
                    <span class="truncate font-medium text-slate-700">{{ batchFileName }}</span>
                  </div>
                </div>

                <div class="flex justify-end pt-4">
                  <UButton color="emerald" :loading="batchLoading" :disabled="!batchFile" @click="submitBatchFile">
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
                  <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Buscar ID..." color="emerald" class="w-64" />

                  <!-- Filter status -->
                  <USelect v-model="filterStatus" :options="['Todos', 'APTO', 'NO APTO']" color="emerald" class="w-32" />

                  <!-- Export Button -->
                  <UButton color="emerald" variant="outline" icon="i-heroicons-document-arrow-down" @click="downloadExcel">
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
                    <th class="py-3 px-4">CaCO3 (%)</th>
                    <th class="py-3 px-4">CaO (%)</th>
                    <th class="py-3 px-4">SiO2 (%)</th>
                    <th class="py-3 px-4">LSF</th>
                    <th class="py-3 px-4">Veredicto Cemento</th>
                    <th class="py-3 px-4">Fecha Registro</th>
                    <th class="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="s in filteredSamples" :key="s.id_muestra" class="hover:bg-slate-50/80 transition-colors cursor-pointer" @click="viewSampleDetails(s)">
                    <td class="py-3 px-4 font-bold text-slate-900">{{ s.id_muestra }}</td>
                    <td class="py-3 px-4">{{ s.caco3 }}%</td>
                    <td class="py-3 px-4">{{ s.cao }}%</td>
                    <td class="py-3 px-4">{{ s.sio2 }}%</td>
                    <td class="py-3 px-4 font-mono">{{ s.lsf?.toFixed(3) }}</td>
                    <td class="py-3 px-4">
                      <span :class="['px-2 py-0.5 rounded-full text-xs font-bold', s.estado_eval === 'APTO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200']">
                        {{ s.estado_eval }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-400">{{ s.fecha_registro }}</td>
                    <td class="py-3 px-4 text-right" @click.stop>
                      <div class="flex justify-end gap-1">
                        <UButton color="slate" variant="ghost" icon="i-heroicons-eye" @click="viewSampleDetails(s)" />
                        <UButton color="rose" variant="ghost" icon="i-heroicons-trash" @click="confirmDeleteSample(s.id_muestra)" />
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

    <!-- INTERACTIVE DETAIL SLIDE-OVER / DRAWER -->
    <USlideover v-model:open="drawerOpen" title="Detalle de Muestra">
      <template #content>
        <div class="h-full flex flex-col bg-white">
          <!-- Drawer Header -->
          <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🪨</span>
              <div>
                <h3 class="font-bold text-lg text-slate-900">Muestra: {{ selectedSample?.id_muestra }}</h3>
                <p class="text-xs text-slate-400">Registrado el: {{ selectedSample?.fecha_registro }}</p>
              </div>
            </div>
            <UButton color="slate" variant="ghost" icon="i-heroicons-x-mark" @click="drawerOpen = false" />
          </div>

          <!-- Drawer Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Main Veredicto banner -->
            <div :class="['p-4 rounded-xl border flex items-center gap-3', selectedSample?.estado_eval === 'APTO' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800']">
              <UIcon :name="selectedSample?.estado_eval === 'APTO' ? 'i-heroicons-trophy' : 'i-heroicons-x-circle'" class="w-8 h-8 shrink-0" />
              <div>
                <p class="font-bold text-sm">
                  {{ selectedSample?.id_muestra }} — {{ selectedSample?.estado_eval === 'APTO' ? 'APTO para Cemento Portland' : 'NO APTO para Cemento Portland' }}
                </p>
                <p class="text-xs mt-0.5 opacity-90">Evaluado bajo normas internacionales ASTM C150 / NTC 321</p>
              </div>
            </div>

            <!-- Tabs of calculations -->
            <UTabs :items="[
              { label: '📊 Química y Módulos', slot: 'quimica' },
              { label: '🔥 Clinker (Bogue)', slot: 'clinker' },
              { label: '🏭 17 Perfiles de Uso', slot: 'perfiles' }
            ]">
              <!-- Química y Módulos Tab -->
              <template #quimica>
                <div class="py-4 space-y-6">
                  <!-- Grid of metrics -->
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">CaCO3 (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.caco3 }}%</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">CaO (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.cao }}%</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">MgO (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.mgo }}%</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">SiO2 (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.sio2 }}%</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">LOI (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.loi?.toFixed(2) }}%</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p class="text-xs font-semibold text-slate-400">Res. Insoluble (%)</p>
                      <p class="text-xl font-extrabold text-slate-800 mt-1">{{ selectedSample?.res_insol?.toFixed(2) }}%</p>
                    </div>
                  </div>

                  <div class="border-t border-slate-100 pt-4 space-y-3">
                    <h4 class="font-bold text-slate-800">Módulos del Horno</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="border border-slate-100 rounded-lg p-3">
                        <p class="text-xs text-slate-400">Factor de Saturación de Cal (LSF)</p>
                        <p class="text-2xl font-black text-slate-800 mt-0.5">{{ selectedSample?.lsf?.toFixed(3) }}</p>
                      </div>
                      <div class="border border-slate-100 rounded-lg p-3">
                        <p class="text-xs text-slate-400">Módulo de Sílice (SM)</p>
                        <p class="text-2xl font-black text-slate-800 mt-0.5">{{ selectedSample?.sm?.toFixed(3) }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Geological Info -->
                  <div class="border-t border-slate-100 pt-4 space-y-3">
                    <h4 class="font-bold text-slate-800">Interpretación Geoquímica (Calizas del Cesar)</h4>
                    <div class="space-y-2">
                      <p class="text-xs font-medium text-slate-500">Textura: <b class="text-slate-800">{{ selectedSample?.petrografia }}</b>, Mineral dominante: <b class="text-slate-800">{{ selectedSample?.drx }}</b></p>
                      <div v-if="getGeologyWarnings(selectedSample).length > 0" class="space-y-1.5">
                        <div v-for="w in getGeologyWarnings(selectedSample)" :key="w" class="p-2.5 bg-slate-50 text-slate-700 text-xs rounded border border-slate-100 flex gap-2">
                          <span>⚠️</span>
                          <span>{{ w }}</span>
                        </div>
                      </div>
                      <div v-else class="p-2 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs rounded">
                        La muestra presenta óptimos rangos recomendados para calizas de alta calidad.
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Clinker Bogue Tab -->
              <template #clinker>
                <div class="py-4 space-y-6">
                  <p class="text-sm text-slate-600">Composición potencial de fases minerales del cemento obtenida mediante ecuaciones estequiométricas de Bogue:</p>

                  <div class="space-y-4">
                    <!-- Alita -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-sm font-semibold">
                        <span class="text-slate-700">Alita (C3S)</span>
                        <span class="text-emerald-600">{{ selectedSample?.c3s }}%</span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-2 rounded-full" :style="`width: ${Math.min(selectedSample?.c3s || 0, 100)}%`"></div>
                      </div>
                      <p class="text-xs text-slate-400">Favorece y controla la resistencia mecánica inicial (temprana) del hormigón.</p>
                    </div>

                    <!-- Belita -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-sm font-semibold">
                        <span class="text-slate-700">Belita (C2S)</span>
                        <span class="text-emerald-600">{{ selectedSample?.c2s }}%</span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-emerald-500 h-2 rounded-full" :style="`width: ${Math.min(selectedSample?.c2s || 0, 100)}%`"></div>
                      </div>
                      <p class="text-xs text-slate-400">Aporta a la ganancia de resistencia a largo plazo (tardía).</p>
                    </div>

                    <!-- Aluminato Tricálcico -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-sm font-semibold">
                        <span class="text-slate-700">Aluminato Tricálcico (C3A)</span>
                        <span class="text-amber-600">{{ selectedSample?.c3a }}%</span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-amber-500 h-2 rounded-full" :style="`width: ${Math.min(selectedSample?.c3a || 0, 100)}%`"></div>
                      </div>
                      <p class="text-xs text-slate-400">Reacción ultra rápida con agua, gobierna los tiempos de fraguado inicial.</p>
                    </div>

                    <!-- Ferritoaluminato Tetracálcico -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-sm font-semibold">
                        <span class="text-slate-700">Ferritoaluminato Tetracálcico (C4AF)</span>
                        <span class="text-blue-600">{{ selectedSample?.c4af }}%</span>
                      </div>
                      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-blue-500 h-2 rounded-full" :style="`width: ${Math.min(selectedSample?.c4af || 0, 100)}%`"></div>
                      </div>
                      <p class="text-xs text-slate-400">Funciona como fundente principal dentro del horno reduciendo temperaturas.</p>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 17 Industrial Profiles Tab -->
              <template #perfiles>
                <div class="py-4 space-y-4">
                  <p class="text-sm text-slate-600">Dictamen sobre 17 perfiles de uso industrial para esta caliza:</p>

                  <div class="space-y-3">
                    <div v-for="p in selectedSample?.dictamenes" :key="p.nombre" class="p-4 border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                      <div class="flex items-start justify-between gap-4">
                        <div>
                          <h5 class="font-bold text-sm text-slate-800">{{ p.nombre }}</h5>
                          <p class="text-xs text-slate-500 mt-0.5 leading-tight">{{ p.aplicacion }}</p>
                          <p class="text-xs text-slate-700 mt-2 italic">“{{ p.razon }}”</p>
                          <p class="text-3xs text-slate-400 mt-1">Norma reguladora: {{ p.norma }}</p>
                        </div>
                        <span :class="[
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0',
                          p.estado === 'Apto' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          p.estado === 'No Apto' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        ]">
                          {{ p.estado }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </UTabs>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- CONFIRM DELETE DIALOG -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <div class="p-6 space-y-4 bg-white rounded-lg">
          <h3 class="font-bold text-lg text-slate-900">¿Estás seguro de eliminar esta muestra?</h3>
          <p class="text-sm text-slate-600">Esta acción es irreversible y eliminará de forma permanente el registro "{{ sampleToDelete }}" de la base de datos SQLite.</p>
          <div class="flex justify-end gap-3 pt-2">
            <UButton color="slate" variant="ghost" @click="deleteModalOpen = false">Cancelar</UButton>
            <UButton color="rose" :loading="deleteLoading" @click="executeDeleteSample">Eliminar Permanentemente</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- NOTIFICATIONS PROVIDER FOR TOASTS -->
    <UNotifications />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

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
const pdfOptions = ref({
  convertir: true,
  loi_manual: 0
})

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
  drx: 'Calcita',
  petrografia: 'Micrítica de grano fino',
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
    const matchesStatus = filterStatus.value === 'Todos' || s.estado_eval === filterStatus.value
    return matchesSearch && matchesStatus
  })
})

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
      description: 'No se pudo conectar con la API de FastAPI. Verifica que el servidor de backend esté corriendo.',
      color: 'rose'
    })
  }
}

// Upload handlers
function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
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
    toast.add({ title: 'Archivo faltante', description: 'Por favor arrastra o selecciona un archivo primero.', color: 'amber' })
    return
  }

  ocrLoading.value = true
  const formData = new FormData()
  formData.append('file', uploadedFile.value)
  formData.append('convertir', pdfOptions.value.convertir ? 'true' : 'false')
  if (pdfOptions.value.convertir && pdfOptions.value.loi_manual) {
    formData.append('loi_manual', String(pdfOptions.value.loi_manual))
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
    toast.add({ title: 'Extracción completada', description: 'Revisa y ajusta los valores antes de guardar.', color: 'emerald' })
  } catch (e) {
    toast.add({ title: 'Error de Extracción', description: e.data?.detail || 'No se pudo leer el PDF. Asegúrate de subir el reporte de Sample Results.', color: 'rose' })
  } finally {
    ocrLoading.value = false
  }
}

async function saveEvaluation(payload) {
  evalLoading.value = true
  try {
    const bodyPayload = {
      id_muestra: payload.muestra_id,
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
      extras: ocrResult.value?.extras || {},
      archivo_fuente: uploadedFileName.value || 'PDF Upload',
      guardar_db: true
    }

    await $fetch(`${apiBase}/evaluar`, {
      method: 'POST',
      body: bodyPayload
    })

    toast.add({ title: 'Muestra Registrada', description: `La muestra "${payload.muestra_id}" se guardó en SQLite exitosamente.`, color: 'emerald' })
    clearUploadedFile()
    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Guardado', description: e.data?.detail || 'No se pudo calcular/guardar la muestra.', color: 'rose' })
  } finally {
    evalLoading.value = false
  }
}

// Manual Form Submit
async function submitManualForm() {
  if (!manualForm.value.id_muestra) {
    toast.add({ title: 'ID faltante', description: 'Por favor asigne un ID único a la muestra.', color: 'amber' })
    return
  }

  evalLoading.value = true
  try {
    const cleanExtras = { ...manualForm.value.extras }

    await $fetch(`${apiBase}/evaluar`, {
      method: 'POST',
      body: {
        id_muestra: manualForm.value.id_muestra,
        caco3: manualForm.value.caco3 || 0,
        cao: manualForm.value.cao || 0,
        mgo: manualForm.value.mgo || 0,
        sio2: manualForm.value.sio2 || 0,
        fe2o3: manualForm.value.fe2o3 || 0,
        al2o3: manualForm.value.al2o3 || 0,
        so3: manualForm.value.so3 || 0,
        na2o: manualForm.value.na2o || 0,
        k2o: manualForm.value.k2o || 0,
        p2o5: manualForm.value.p2o5 || 0,
        pb: manualForm.value.pb || 0,
        cd: manualForm.value.cd || 0,
        as_ppm: manualForm.value.as_ppm || 0,
        drx: manualForm.value.drx,
        petrografia: manualForm.value.petrografia,
        extras: cleanExtras,
        archivo_fuente: 'Formulario manual',
        guardar_db: true
      }
    })

    toast.add({ title: 'Muestra Registrada', description: `Muestra "${manualForm.value.id_muestra}" evaluada y registrada con éxito.`, color: 'emerald' })

    // Reset form
    manualForm.value = {
      id_muestra: '', caco3: null, cao: null, mgo: null, sio2: null, fe2o3: null, al2o3: null, so3: null,
      na2o: null, k2o: null, p2o5: null, pb: null, cd: null, as_ppm: null, drx: 'Calcita', petrografia: 'Micrítica de grano fino',
      extras: { pn: null, blancura: null, tamano_particula: null, humedad: null, cao_disponible: null, cao_reactivo: null, resistencia: null, absorcion: null }
    }

    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Guardado', description: e.data?.detail || 'No se pudo realizar la evaluación.', color: 'rose' })
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

  try {
    const data = await $fetch(`${apiBase}/procesar-lote`, {
      method: 'POST',
      body: formData
    })
    toast.add({ title: 'Carga Masiva Exitosa', description: `Se procesaron e insertaron ${data.count} muestras exitosamente.`, color: 'emerald' })
    batchFile.value = null
    batchFileName.value = ''
    fetchHistorial()
    activeTab.value = 'dashboard'
  } catch (e) {
    toast.add({ title: 'Error de Lote', description: e.data?.detail || 'No se pudo procesar el archivo por lotes.', color: 'rose' })
  } finally {
    batchLoading.value = false
  }
}

// Visualizer details
function viewSampleDetails(sample) {
  selectedSample.value = sample
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
    await $fetch(`${apiBase}/historial/${sampleToDelete.value}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Muestra Eliminada', description: `La muestra "${sampleToDelete.value}" se borró exitosamente.`, color: 'emerald' })
    fetchHistorial()
  } catch (e) {
    toast.add({ title: 'Error de Eliminación', description: 'No se pudo borrar el registro.', color: 'rose' })
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
