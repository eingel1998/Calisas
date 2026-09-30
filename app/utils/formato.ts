const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export function num(v: unknown, unidad = '') {
  if (v == null || v === '' || !Number.isFinite(Number(v))) return '—'
  return `${numero.format(Number(v))}${unidad ? ` ${unidad}` : ''}`
}

export function fecha(iso?: string | null) {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? fechaCorta.format(d) : '—'
}

// Mismos niveles que el informe integral (server/utils/informe-integral.ts), de mayor a menor valor por tonelada.
export const NIVELES = [
  { nivel: 'Alto valor', usos: ['Industria farmacéutica', 'Industria alimentaria', 'Industria química', 'Industria del papel', 'Industria del plástico', 'Industria de pinturas', 'Industria del caucho'] },
  { nivel: 'Valor medio', usos: ['Producción de cal viva', 'Producción de cal hidratada', 'Industria del vidrio', 'Industria cerámica', 'Industria siderúrgica', 'Tratamiento de aguas', 'Protección ambiental'] },
  { nivel: 'Volumen', usos: ['Industria cementera', 'Cal agrícola', 'Material de construcción'] },
]
const ORDEN = NIVELES.flatMap(n => n.usos)

// Usos aptos ordenados por valor comercial: el primero es el mejor destino técnico hoy.
export function usosAptos(dictamenes?: Array<{ nombre: string; estado: string }> | null) {
  return (dictamenes || []).filter(d => d.estado === 'Apto').map(d => d.nombre).sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b))
}

// "Industria del papel" → "Papel", para que quepa en la tabla.
export const usoCorto = (nombre: string) => nombre.replace(/^(Industria (del |de la |de )?|Producción de )/, '').replace(/^\w/, c => c.toUpperCase())
