import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function component(name: string) {
  return readFileSync(resolve(`app/components/ui/${name}.vue`), 'utf8')
}

it('mantiene los contratos base de interfaz', () => {
  const field = component('AppField')
  const select = component('AppSelect')
  const section = component('AppSection')
  const table = component('AppTable')

  expect(field).toContain("'modelValue'")
  expect(field).toContain('inheritAttrs: false')
  expect(field).toContain('<UInput')
  expect(select).toContain('<USelect')
  expect(section).toContain('<slot')
  expect(table).toContain('<thead')
})

it('usa la barra lateral compartida', () => {
  const app = readFileSync(resolve('app/app.vue'), 'utf8')
  const sidebar = readFileSync(resolve('app/components/SidebarNav.vue'), 'utf8')
  expect(app).toContain('<SidebarNav')
  for (const tab of ['dashboard', 'cargar', 'historial', 'configuracion']) expect(sidebar).toContain(`{ id: '${tab}'`)
  expect(sidebar).not.toContain("id: 'analisis'")
  expect(sidebar).toContain("defineEmits(['navigate', 'install'])")
})

it('carga una muestra con todos sus análisis en un solo panel', () => {
  const app = readFileSync(resolve('app/app.vue'), 'utf8')
  const carga = readFileSync(resolve('app/components/evaluation/CargarMuestra.vue'), 'utf8')
  const context = readFileSync(resolve('app/components/evaluation/EvaluationContextPanel.vue'), 'utf8')

  expect(app).toContain('<CargarMuestra')
  for (const ref of ['drxRef', 'petroRef', 'termicasRef']) expect(carga).toContain(`ref="${ref}"`)
  expect(carga).toContain('Guardar muestra')
  expect(context).toContain("defineModel<any>('options'")
  expect(app).toContain(':muestra="muestraEnEdicion"')
  expect(carga).toContain("method: 'PUT'")
  expect(carga).toContain('Guardar cambios')
})
