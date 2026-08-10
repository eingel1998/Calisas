# Evaluación Geoquímica de Calizas

Software para evaluar muestras de caliza y dictaminar su aptitud en **17 usos industriales** (cemento Portland, cales, siderurgia, vidrio, papel, alimentaria, farmacéutica, etc.) según normas ASTM / NTC / ISO. Calcula LSF, módulos de sílice y alúmina, fases de Bogue (C3S, C2S, C3A, C4AF) y valida límites de la norma ASTM C150 / NTC 321.

App única Nuxt 4 + Nitro: frontend y backend en un solo proceso, un solo deploy.

## Estructura

| Ruta | Qué es |
|---|---|
| `app/app.vue` | UI completa (SPA): dashboard, PDF, formulario manual, lote, historial, drawer de detalle |
| `server/api/*.ts` | Rutas Nitro: `/api/evaluar`, `/api/procesar-pdf`, `/api/historial`, `/api/exportar-excel`, `/api/procesar-lote` |
| `server/utils/calculos.ts` | Motor de cálculo portado 1:1 de Python: parser XRF Omnian, conversión de base, LSF/SM/AM, Bogue, matriz de 17 perfiles |
| `server/utils/pdf.ts` | Extracción de texto PDF (pdfjs-dist) |
| `server/utils/lote.ts` | Carga por lote CSV/XLSX con normalización de columnas (tildes, DRX/PETROGRAFÍA) |
| `server/utils/excel.ts` | Exportación del historial a Excel (exceljs) |
| `server/utils/db.ts` | Capa de datos con `@libsql/client` (SQLite local, Turso futuro) |
| `server/plugins/db.ts` | Crea el esquema de la base al arrancar |
| `server/utils/calculos.test.ts` | Tests Vitest del motor (paridad con los asserts Python originales) |

## Instalación

Requiere Node 20+.

```bash
npm install
```

## Uso

```bash
npm run dev        # http://localhost:3000
npm run build      # build de producción (.output)
npm run preview    # servir el build
npm test           # suite Vitest del motor
```

Tres formas de ingresar muestras:

1. **📄 Procesar PDF** — PDF del laboratorio (XRF Panalytical/Omnian), reporte *"Sample results"*. Extracción automática de composición, trazas (Pb, Cd, As) e ID de muestra. Conversión automática de base calcinada → seca (LOI estimado o medido).
2. **✍️ Entrada Manual** — formulario con la química completa y ensayos opcionales.
3. **📑 Carga por Lote (Excel/CSV)** — archivo con columnas `ID Muestra, CaCO3, CaO, MgO, SiO2, Fe2O3, Al2O3, SO3, Na2O, K2O` (+ DRX, Petrografía). Las columnas se normalizan (acentos, espacios, `(%)`).

**Ensayos opcionales** (blancura, granulometría, humedad, PN, CaO disponible/reactivo, resistencia, absorción): si se dejan vacíos, los dictámenes que dependen de ellos salen como *"Requiere ensayos"* en lugar de inventar un valor. El PN se estima con el CaCO3 equivalente si no se mide.

En **Consultar Historial**: tabla completa de la base, descarga del Excel (`/api/exportar-excel`) y detalle de cualquier muestra.

## Base de datos

- SQLite local por defecto: `calizas.db` (se crea solo al arrancar; no se commitea).
- Migración a **Turso** sin cambiar código: setear `TURSO_URL` y `TURSO_TOKEN` en el entorno.

## Notas de dominio

- **LSF alto en caliza pura no es error**: el rango 0.9–1.0 aplica a la *mezcla* de horno (caliza + arcilla), no a la roca sola. LSF/SM/AM son cocientes: no cambian con la conversión de base.
- Los umbrales de los 17 perfiles viven en `PERFILES_INDUSTRIALES` (`server/utils/calculos.ts`): cambiar un límite es editar una línea.
- Metales pesados para alimentaria/farmacéutica: Pb < 3, Cd < 1, As < 3 ppm (FCC / Reglamento UE 231/2012).
