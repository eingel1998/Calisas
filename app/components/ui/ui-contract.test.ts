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
  expect(sidebar).toContain("{ id: 'pdf'")
  expect(sidebar).toContain("defineEmits(['navigate'])")
})

it('separa los flujos de evaluación de la vista principal', () => {
  const evaluation = readFileSync(resolve('app/components/evaluation/EvaluationView.vue'), 'utf8')
  const context = readFileSync(resolve('app/components/evaluation/EvaluationContextPanel.vue'), 'utf8')
  const pdf = readFileSync(resolve('app/components/evaluation/PdfEvaluationPanel.vue'), 'utf8')
  const manual = readFileSync(resolve('app/components/evaluation/ManualEvaluationForm.vue'), 'utf8')
  const batch = readFileSync(resolve('app/components/evaluation/BatchEvaluationPanel.vue'), 'utf8')

  expect(evaluation).toContain("defineModel<string>('subTab'")
  expect(context).toContain("defineModel<any>('options'")
  expect(pdf).toContain("defineModel<any>('result'")
  expect(manual).toContain("defineModel<any>('form'")
  expect(batch).toContain("defineEmits(['select-file', 'submit'])")
})
