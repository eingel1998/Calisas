import DOMPurify from 'dompurify'
import { marked } from 'marked'

const SUB: Record<string, string> = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋' }
const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻' }
const SIMBOLOS: Record<string, string> = { rightarrow: '→', to: '→', leftarrow: '←', uparrow: '↑', downarrow: '↓', approx: '≈', times: '×', cdot: '·', le: '≤', leq: '≤', ge: '≥', geq: '≥', pm: '±', sim: '~', circ: '°', degree: '°', mu: 'µ', alpha: 'α', beta: 'β', theta: 'θ', lambda: 'λ', Delta: 'Δ', delta: 'δ' }

function formula(tex: string) {
  return tex
    .replace(/\\(?:text|mathrm|mathbf|textbf|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/_\{([^{}]*)\}|_([0-9+-])/g, (_, a, b) => [...(a ?? b)].map(c => SUB[c] ?? c).join(''))
    .replace(/\^\{([^{}]*)\}|\^([0-9+-])/g, (_, a, b) => [...(a ?? b)].map(c => SUP[c] ?? c).join(''))
    .replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => `${/[\s+−-]/.test(a) ? `(${a})` : a}/${/[\s+−-]/.test(b) ? `(${b})` : b}`)
    .replace(/\\q?quad/g, '  ')
    .replace(/\\[,;: !]/g, ' ')
    .replace(/\\%/g, '%')
    .replace(/\\([A-Za-z]+)/g, (m, cmd) => SIMBOLOS[cmd] ?? (/^(left|right|big|Big)$/.test(cmd) ? '' : m))
    .replace(/[{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Los modelos a veces escriben fórmulas en LaTeX ($\text{CaO} = 92\,\%$); se pasan a texto con subíndices.
export function limpiarLatex(texto: string) {
  // solo segmentos con sintaxis LaTeX: «USD $120 y $150» no es una fórmula
  const conDelimitadores = texto.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (m, bloque, linea) => /[\\_^]/.test(bloque ?? linea) ? formula(bloque ?? linea) : m)
  // comandos sueltos sin $: solo los conocidos, para no tocar los escapes propios del Markdown (\*, \_)
  return conDelimitadores.replace(/\\d?frac\{[^{}]*\}\{[^{}]*\}|\\(?:text|mathrm)\{[^{}]*\}(?:_\{?[0-9+-]+\}?)?|\\q?quad|\\(?:rightarrow|approx|times|cdot|leq?|geq?|pm|uparrow|downarrow)\b/g, m => formula(m) || ' ')
}

// Markdown del informe → HTML saneado (el texto viene de un modelo y puede traer contenido de la web).
export function informeHtml(texto: string) {
  const html = marked.parse(limpiarLatex(texto), { async: false, gfm: true }) as string
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }).replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
}
