# Evaluación Geoquímica de Calizas

Software para evaluar muestras de caliza y dictaminar su aptitud en **17 usos industriales** (cemento Portland, cales, siderurgia, vidrio, papel, alimentaria, farmacéutica, etc.) según normas ASTM / NTC / ISO. Calcula LSF, módulos de sílice y alúmina, fases de Bogue (C3S, C2S, C3A, C4AF) y valida límites de la norma ASTM C150 / NTC 321.

## Estructura

| Archivo | Qué es |
|---|---|
| `app_web.py` | App principal (Streamlit): formularios, extracción de PDF/imagen, dictámenes, historial |
| `app_escritorio.py` | App de escritorio (customtkinter), módulo cemento |
| `calculos_calizas.py` | Motor compartido: fórmulas, matriz de 17 perfiles, parser de PDF XRF, conversión de base, persistencia en Excel |
| `pruebas.py` | Inicializa la base de datos Excel si no existe |
| `test_calculos_calizas.py` | Checks del motor de cálculo |
| `BaseDatos_Calizas.xlsx` | Base de datos de muestras (se crea sola al guardar la primera) |

## Instalación

Requiere Python 3.10+.

```bash
pip install -r requirements.txt
```

Opcionales (solo para leer imágenes con IA/OCR en la app web):

```bash
pip install google-genai pytesseract
```

## Uso

### App web (recomendada)

```bash
streamlit run app_web.py
```

Tres formas de ingresar muestras:

1. **📄 Procesar PDF / Imagen** — el flujo principal:
   - **PDF del laboratorio (XRF Panalytical/Omnian)**: suba el reporte *"Sample results"* (el de la tabla, no el del espectro). La extracción es automática, sin OCR ni API: composición, trazas (Pb, Cd, As) e ID de muestra.
   - **Conversión a base seca**: el XRF reporta óxidos en base calcinada (suman ~100% sin LOI). La app lo detecta y convierte automáticamente, estimando LOI y CaCO3 equivalente. Si midió el LOI real, escríbalo para una conversión exacta.
   - **Varios PDFs a la vez**: modo lote con tabla editable y guardado masivo.
   - **Imagen (foto/captura)**: requiere API Key de Google Gemini (gratuita en [AI Studio](https://aistudio.google.com)); Tesseract queda como respaldo básico.
2. **✍️ Entrada Manual** — formulario con la química completa y ensayos opcionales.
3. **📑 Carga por Lote (Excel/CSV)** — archivo con columnas `ID Muestra, CaCO3, CaO, MgO, SiO2, Fe2O3, Al2O3, SO3, Na2O, K2O`.

**Ensayos opcionales** (blancura, granulometría, humedad, PN, CaO disponible/reactivo, resistencia, absorción): si se dejan vacíos, los dictámenes que dependen de ellos salen como *"Requiere ensayos"* en lugar de inventar un valor. El PN se estima con el CaCO3 equivalente si no se mide.

En **Consultar Historial**: tabla completa de la base, descarga del Excel y detalle de cualquier muestra.

### App de escritorio

```bash
python app_escritorio.py
```

### Tests

```bash
python test_calculos_calizas.py
```

## Notas de dominio

- **LSF alto en caliza pura no es error**: el rango 0.9–1.0 aplica a la *mezcla* de horno (caliza + arcilla), no a la roca sola. LSF/SM/AM son cocientes: no cambian con la conversión de base.
- Los umbrales de los 17 perfiles viven en `PERFILES_INDUSTRIALES` (`calculos_calizas.py`): cambiar un límite es editar una línea.
- Metales pesados para alimentaria/farmacéutica: Pb < 3, Cd < 1, As < 3 ppm (FCC / Reglamento UE 231/2012).
