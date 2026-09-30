import { expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({ default: { sanitize: (h: string) => h } }))
const { limpiarLatex } = await import('./informe-md')

it('convierte las fórmulas LaTeX de los informes a texto con subíndices', () => {
  expect(limpiarLatex('$\\text{CaO} = 92.576\\,\\%$')).toBe('CaO = 92.576 %')
  expect(limpiarLatex('$\\text{SiO}_2 / \\text{Al}_2\\text{O}_3 \\approx 3.06$')).toBe('SiO₂ / Al₂O₃ ≈ 3.06')
  expect(limpiarLatex('($\\text{CaCO}_3 \\rightarrow \\text{CaO} + \\text{CO}_2 \\uparrow$)')).toBe('(CaCO₃ → CaO + CO₂ ↑)')
  expect(limpiarLatex('$\\text{Mn}^{2+}$ y $15.829\\text{ ppm}$')).toBe('Mn²⁺ y 15.829 ppm')
  expect(limpiarLatex('$$\\frac{\\text{CaO}}{\\text{MgO}} = \\frac{53.48}{0.235} = 227.57$$')).toBe('CaO/MgO = 53.48/0.235 = 227.57')
  expect(limpiarLatex('$\\frac{\\text{SiO}_2}{\\text{Al}_2\\text{O}_3 + \\text{Fe}_2\\text{O}_3} = 1.93$')).toBe('SiO₂/(Al₂O₃ + Fe₂O₃) = 1.93')
  expect(limpiarLatex('$95.46\\,\\% \\quad (\\text{reportado})$')).toBe('95.46 % (reportado)')
  expect(limpiarLatex('CaCO₃ = 95.46 % \\quad (reportado: 95.45 %) y \\frac{a}{b} \\approx 2')).toBe('CaCO₃ = 95.46 %   (reportado: 95.45 %) y a/b ≈ 2')
  expect(limpiarLatex('Usa **negrita** y 3 \\* 2')).toBe('Usa **negrita** y 3 \\* 2')
  expect(limpiarLatex('Cal viva: USD $120 y carbonato $150 por t')).toBe('Cal viva: USD $120 y carbonato $150 por t')
})
