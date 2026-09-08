<template>
  <UModal v-model:open="open" @update:open="handleOpenChange">
    <template #content>
      <div class="p-6 space-y-6 bg-elevated rounded-lg max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-pencil-square" class="text-primary w-5 h-5" />
            <h3 class="font-bold text-lg text-default">Entrada Manual</h3>
          </div>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="close" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">ID Muestra *</label>
            <UInput v-model="form.id_muestra" required placeholder="Ej: CAR-001" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">CaCO3 (%)</label>
            <UInput v-model.number="form.caco3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 94.8" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">CaO (%)</label>
            <UInput v-model.number="form.cao" type="number" step="0.01" min="0" max="100" placeholder="Ej: 54.1" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">MgO (%)</label>
            <UInput v-model.number="form.mgo" type="number" step="0.01" min="0" max="100" placeholder="Ej: 0.8" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">SiO2 (%)</label>
            <UInput v-model.number="form.sio2" type="number" step="0.01" min="0" max="100" placeholder="Ej: 6.4" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Fe2O3 (%)</label>
            <UInput v-model.number="form.fe2o3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 1.9" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Al2O3 (%)</label>
            <UInput v-model.number="form.al2o3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 2.8" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">SO3 (%)</label>
            <UInput v-model.number="form.so3" type="number" step="0.01" min="0" max="100" placeholder="Ej: 2.4" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Na2O (%)</label>
            <UInput v-model.number="form.na2o" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">K2O (%)</label>
            <UInput v-model.number="form.k2o" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">P2O5 (%)</label>
            <UInput v-model.number="form.p2o5" type="number" step="0.01" min="0" max="100" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Plomo - Pb (ppm)</label>
            <UInput v-model.number="form.pb" type="number" step="0.01" min="0" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Cadmio - Cd (ppm)</label>
            <UInput v-model.number="form.cd" type="number" step="0.01" min="0" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Arsénico - As (ppm)</label>
            <UInput v-model.number="form.as_ppm" type="number" step="0.01" min="0" placeholder="0.0" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Fase Mineral Dominante (DRX)</label>
            <USelect v-model="form.drx" :options="['Calcita', 'Calcita Magnesiana', 'Dolomita']" color="primary" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-default mb-1.5">Textura Dominante (Petrografía)</label>
            <USelect v-model="form.petrografia" :options="['Micrítica de grano fino', 'Esparítica de grano grueso']" color="primary" />
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

        <div class="flex justify-end border-t border-muted pt-6">
          <UButton color="primary" icon="i-heroicons-check-circle" :loading="evalLoading" @click="submit">
            Calcular LSF y Evaluar Muestra
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
import { ref } from 'vue'

const open = defineModel('open', { type: Boolean, default: false })

defineProps({
  evalLoading: { type: Boolean, default: false }
})
const emit = defineEmits(['save', 'cancel'])

const toast = useToast()

const defaults = {
  id_muestra: '',
  caco3: null, cao: null, mgo: null, sio2: null, fe2o3: null, al2o3: null,
  so3: null, na2o: null, k2o: null, p2o5: null, pb: null, cd: null, as_ppm: null,
  drx: 'Calcita',
  petrografia: 'Micrítica de grano fino',
  extras: {
    pn: null, blancura: null, tamano_particula: null, humedad: null,
    cao_disponible: null, cao_reactivo: null, resistencia: null, absorcion: null
  }
}

const form = ref({ ...defaults, extras: { ...defaults.extras } })

function handleOpenChange(val) {
  if (val) {
    form.value = { ...defaults, extras: { ...defaults.extras } }
  } else {
    emit('cancel')
  }
}

function close() {
  open.value = false
  emit('cancel')
}

function submit() {
  if (!form.value.id_muestra) {
    toast.add({ title: 'ID faltante', description: 'Por favor asigne un ID único a la muestra.', color: 'warning' })
    return
  }
  emit('save', { ...form.value, extras: { ...form.value.extras }, archivo_fuente: 'Formulario manual' })
}
</script>