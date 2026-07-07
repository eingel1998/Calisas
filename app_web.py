import streamlit as st
import pandas as pd
import os
import math
import json
from PIL import Image
try:
    from google import genai
except ImportError:
    genai = None
try:
    import pytesseract
except ImportError:
    pytesseract = None
import re
import io
from calculos_calizas import (
    guardar_en_excel, calcular_evaluacion, extraer_datos_pdf,
    es_base_calcinada, convertir_base_seca, validar_extraccion, OXIDOS,
)

# --- Configuración de la página ---
st.set_page_config(page_title="Evaluación de Calizas", page_icon="🪨", layout="wide")

def evaluar_y_mostrar_resultados(muestra_id, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o=0.0, k2o=0.0, p2o5=0.0, pb=0.0, cd=0.0, as_ppm=0.0, drx="Calcita", petrografia="Micrítica de grano fino", guardar=True, loi=0.0, res_insol=0.0, alcalis=0.0, fuente="", extras=None, persistir=None):
    # guardar controla el recálculo de LOI/res_insol/álcalis; persistir controla la
    # escritura en Excel (por defecto van juntos, pero al re-renderizar resultados
    # tras un rerun de Streamlit se pasa persistir=False para no duplicar filas)
    if persistir is None:
        persistir = guardar
    r = calcular_evaluacion(caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm,
                             petrografia, guardar, loi, res_insol, alcalis, extras=extras)
    caco3, cao, mgo, sio2, fe2o3, al2o3, so3 = r["caco3"], r["cao"], r["mgo"], r["sio2"], r["fe2o3"], r["al2o3"], r["so3"]
    na2o, k2o, p2o5, pb, cd, as_ppm = r["na2o"], r["k2o"], r["p2o5"], r["pb"], r["cd"], r["as_ppm"]
    loi, res_insol, alcalis = r["loi"], r["res_insol"], r["alcalis"]
    lsf, sm, am, interp_sm, interp_am = r["lsf"], r["sm"], r["am"], r["interp_sm"], r["interp_am"]
    c3s, c2s, c3a, c4af = r["c3s"], r["c2s"], r["c3a"], r["c4af"]
    advertencias_geol, interp_cesar = r["advertencias_geol"], r["interp_cesar"]
    errores_norma, cumple_norma, estado_eval = r["errores_norma"], r["cumple_norma"], r["estado_eval"]
    dictamenes_calc = r["dictamenes"]

    # --- Guardar en Excel si corresponde ---
    if persistir:
        datos = {
            "ID Muestra": muestra_id,
            "CaCO3 (%)": caco3,
            "CaO (%)": cao, 
            "MgO (%)": mgo,
            "SiO2 (%)": sio2,
            "Fe2O3 (%)": fe2o3, 
            "Al2O3 (%)": al2o3,
            "LSF": round(lsf, 3),
            "SO3 (%)": so3,
            "Na2O (%)": na2o,
            "K2O (%)": k2o,
            "P2O5 (%)": p2o5,
            "Pb (ppm)": pb,
            "Cd (ppm)": cd,
            "As (ppm)": as_ppm,
            "DRX": drx,
            "Petrografía": petrografia,
            "LOI (%)": round(loi, 3),
            "Residuo Insoluble (%)": round(res_insol, 3),
            "Alcalis (Na2Oeq) (%)": round(alcalis, 3),
            "C3S (Alita) (%)": c3s,
            "C2S (Belita) (%)": c2s,
            "C3A (%)": c3a,
            "C4AF (%)": c4af,
            "Modulo de Silice (SM)": round(sm, 3),
            "Modulo de Alumina (AM)": round(am, 3),
            "Estado Evaluacion": estado_eval,
            "Archivo Fuente": fuente,
            "Fecha Registro": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
        }
        for perfil in dictamenes_calc:
            datos[f"Dictamen {perfil['nombre']}"] = perfil["estado"]
        # Ensayos opcionales: se guardan solo los que se midieron
        etiquetas_extras = {
            "pn": "PN (%)", "blancura": "Blancura (%)", "tamano_particula": "Tamaño Partícula (µm)",
            "humedad": "Humedad (%)", "cao_disponible": "CaO Disponible (%)",
            "cao_reactivo": "CaO Reactivo (%)", "resistencia": "Resistencia (MPa)", "absorcion": "Absorción (%)",
        }
        for k, etiqueta in etiquetas_extras.items():
            if (extras or {}).get(k) is not None:
                datos[etiqueta] = extras[k]
        try:
            guardar_en_excel(datos)
            st.success(f"Muestra '{muestra_id}' evaluada y registrada con éxito en Excel.")
        except PermissionError:
            st.error("Error al escribir en Excel: El archivo 'BaseDatos_Calizas.xlsx' está abierto. Por favor, ciérrelo e intente de nuevo.")
            st.stop()
    elif not guardar:
        st.info(f"Mostrando registro histórico para la muestra '{muestra_id}'.")

    # --- Mostrar Conclusiones en Pantalla ---
    st.write("---")

    aptos = sum(1 for p in dictamenes_calc if p["estado"] == "Apto")
    no_aptos = sum(1 for p in dictamenes_calc if p["estado"] == "No Apto")
    pendientes = len(dictamenes_calc) - aptos - no_aptos

    # Veredicto principal siempre visible
    if cumple_norma:
        st.success(f"🏆 **{muestra_id} — APTO para Cemento Portland** · Cumple ASTM C150 / NTC 321")
    else:
        st.error(f"❌ **{muestra_id} — NO APTO para Cemento Portland** · Excede límites de ASTM C150 / NTC 321")

    col_k1, col_k2, col_k3, col_k4 = st.columns(4)
    col_k1.metric("Saturación de Cal (LSF)", f"{round(lsf, 3)}")
    col_k2.metric("✅ Usos aptos", f"{aptos}/{len(dictamenes_calc)}")
    col_k3.metric("❌ No aptos", no_aptos)
    col_k4.metric("🔬 Requieren ensayos", pendientes)

    tab_quim, tab_horno, tab_usos, tab_geo = st.tabs([
        "📊 Química y norma", "🔥 Clinker y módulos",
        f"🏭 Usos industriales ({len(dictamenes_calc)})", "🪨 Geología",
    ])

    with tab_quim:
        c1, c2, c3 = st.columns(3)
        c1.metric("LOI Calculado (%)", f"{round(loi, 3)}")
        c2.metric("Residuo Insoluble (%)", f"{round(res_insol, 3)}")
        c3.metric("Álcalis Equivalentes (%)", f"{round(alcalis, 3)}")

        if errores_norma:
            st.markdown("**Desviaciones frente a ASTM C150 / NTC 321:**")
            for err in errores_norma:
                st.error(err)
        else:
            st.info("Sin desviaciones frente a los límites obligatorios de la norma.")

        if advertencias_geol:
            with st.expander(f"Observaciones de rangos recomendados ({len(advertencias_geol)})"):
                for adv in advertencias_geol:
                    st.write(f"⚠️ {adv}")

    with tab_horno:
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Saturación de Cal (LSF)", f"{round(lsf, 3)}")
        with c2:
            st.metric("Módulo de Sílice (SM)", f"{round(sm, 3)}")
            if interp_sm == "Adecuado":
                st.success(interp_sm)
            elif interp_sm == "Mezcla difícil de clinkerizar":
                st.error(interp_sm)
            else:
                st.warning(interp_sm)
        with c3:
            st.metric("Módulo de Alúmina (AM)", f"{round(am, 3)}")
            if interp_am == "Óptimo industrial":
                st.success(interp_am)
            else:
                st.warning(interp_am)

        st.write("---")
        st.markdown("**Mineralogía potencial del clinker (Bogue)**")
        b1, b2, b3, b4 = st.columns(4)
        b1.metric("Alita (C3S)", f"{c3s}%")
        b1.caption("Resistencia temprana")
        b2.metric("Belita (C2S)", f"{c2s}%")
        b2.caption("Resistencia tardía")
        b3.metric("C3A", f"{c3a}%")
        b3.caption("Fraguado rápido")
        b4.metric("C4AF", f"{c4af}%")
        b4.caption("Fundente en el horno")

        st.write("---")
        reporte_conclusion = []
        if mgo > 5.0:
            reporte_conclusion.append("Muestra no apta por riesgo de expansión debido a la formación de periclasa (MgO > 5%). Posible presencia de dolomita que requiere confirmación por DRX.")
        if alcalis > 0.6:
            reporte_conclusion.append("Riesgo de reacción álcali-sílice preventiva; se requiere control de álcalis en la formulación.")
        if 2.0 <= sm <= 3.0 and 1.3 <= am <= 2.5:
            reporte_conclusion.append("Fácil de clinkerizar (Módulos SM y AM en rango óptimo).")
        elif sm > 3.0:
            reporte_conclusion.append("Requiere mayor temperatura de horno (Módulo de Sílice elevado).")
        elif am > 2.5 or am < 1.3:
            reporte_conclusion.append("Presenta riesgo de anillos en el horno o desequilibrio en fundentes (Módulo de Alúmina fuera de rango).")
        if not reporte_conclusion:
            reporte_conclusion.append("La muestra presenta características estándar sin riesgos mayores identificados.")
        for rep in reporte_conclusion:
            st.write(f"📝 {rep}")

        if "Micrítica" in petrografia:
            st.info(f"🔬 **Petrografía ({petrografia}):** caliza micrítica, reaccionará más rápido en el horno que una esparítica, favoreciendo la clinkerización.")
        elif "Esparítica" in petrografia:
            st.info(f"🔬 **Petrografía ({petrografia}):** caliza esparítica, cristales más grandes; puede requerir mayor temperatura o tiempo de residencia en el horno.")

    with tab_usos:
        for titulo, estado in [("✅ Apto", "Apto"), ("🔬 Requiere ensayos", "Requiere ensayos"), ("❌ No Apto", "No Apto")]:
            perfiles = [p for p in dictamenes_calc if p["estado"] == estado]
            if not perfiles:
                continue
            st.markdown(f"#### {titulo} ({len(perfiles)})")
            cols = st.columns(3)
            for i, perfil in enumerate(perfiles):
                with cols[i % 3], st.container(border=True):
                    st.markdown(f"**{perfil['nombre']}**")
                    st.caption(perfil["aplicacion"])
                    st.write(perfil["razon"])
                    st.caption(f"Norma: {perfil['norma']}")

    with tab_geo:
        st.markdown("**Interpretación Geoquímica (Calizas del Cesar)**")
        for interp in interp_cesar:
            if "✅" in interp:
                st.success(interp)
            elif "⚠️" in interp:
                st.warning(interp)
            else:
                st.info(interp)
        if advertencias_geol:
            st.markdown("**Observaciones de rangos recomendados:**")
            for adv in advertencias_geol:
                st.write(f"⚠️ {adv}")


def campos_ensayos_opcionales(prefijo):
    """Ensayos opcionales: si quedan vacíos, los dictámenes que dependen de ellos
    salen como 'Requiere ensayos' en lugar de inventar un valor."""
    with st.expander("Ensayos adicionales (opcionales — habilitan más dictámenes industriales)"):
        c1, c2 = st.columns(2)
        with c1:
            pn = st.number_input("Poder Neutralizante PN (%)", min_value=0.0, max_value=200.0, value=None, key=prefijo + "pn", help="Si se deja vacío, se estima con el CaCO3 equivalente")
            blancura = st.number_input("Blancura (%)", min_value=0.0, max_value=100.0, value=None, key=prefijo + "blancura")
            tamano = st.number_input("Tamaño de partícula (µm)", min_value=0.0, value=None, key=prefijo + "tamano")
            humedad = st.number_input("Humedad (%)", min_value=0.0, max_value=100.0, value=None, key=prefijo + "humedad")
        with c2:
            cao_disp = st.number_input("CaO disponible (%)", min_value=0.0, max_value=100.0, value=None, key=prefijo + "caodisp")
            cao_react = st.number_input("CaO reactivo (%)", min_value=0.0, max_value=100.0, value=None, key=prefijo + "caoreact")
            resistencia = st.number_input("Resistencia a compresión (MPa)", min_value=0.0, value=None, key=prefijo + "resist")
            absorcion = st.number_input("Absorción (%)", min_value=0.0, max_value=100.0, value=None, key=prefijo + "absor")
    return {"pn": pn, "blancura": blancura, "tamano_particula": tamano, "humedad": humedad,
            "cao_disponible": cao_disp, "cao_reactivo": cao_react,
            "resistencia": resistencia, "absorcion": absorcion}


# --- Interfaz Web ---
st.title("🪨 Evaluación Geoquímica de Calizas")
st.caption("Dictamen multi-industria (17 usos) · ASTM / NTC / ISO · Cemento Portland, cales, cargas minerales y más")

st.sidebar.title("🪨 Calizas")
st.sidebar.caption("Evaluación geoquímica multi-uso")
modo = st.sidebar.radio("Modo de Operación", ["Evaluar Nueva Muestra", "Consultar Historial"])
st.sidebar.divider()
st.sidebar.caption("💡 Suba el PDF del laboratorio (XRF) en la pestaña *Procesar PDF / Imagen* — la extracción es automática.")

if modo == "Evaluar Nueva Muestra":
    tab_img, tab_manual, tab_lote = st.tabs(["📄 Procesar PDF / Imagen", "✍️ Entrada Manual", "📑 Carga por Lote (Excel/CSV)"])
    
    with tab_manual:
        with st.form("form_calizas"):
            st.write("Ingrese los parámetros químicos e impurezas:")
            col1, col2 = st.columns(2)
            with col1:
                muestra_id = st.text_input("ID de la Muestra (Ej: CAR-001)")
                caco3 = st.number_input("CaCO3 (%) [Recomendado: > 75-80%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                cao = st.number_input("CaO (%) [Recomendado: 45-52%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                mgo = st.number_input("MgO (%) [Límite ASTM: <= 5.0%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                sio2 = st.number_input("SiO2 (%) [Recomendado: 5-15%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                fe2o3 = st.number_input("Fe2O3 (%) [Recomendado: 1-5%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                p2o5 = st.number_input("P2O5 (%) [Fósforo]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                drx = st.selectbox("Fase Mineral Dominante (DRX)", ["Calcita", "Calcita Magnesiana", "Dolomita"])
                
            with col2:
                al2o3 = st.number_input("Al2O3 (%) [Recomendado: 1-6%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                so3 = st.number_input("SO3 (%) [Recomendado: 3.0-3.5%]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                na2o = st.number_input("Na2O (%) [Óxido de sodio]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                k2o = st.number_input("K2O (%) [Óxido de potasio]", min_value=0.0, max_value=100.0, format="%.2f", value=None)
                pb = st.number_input("Plomo - Pb (ppm)", min_value=0.0, value=None)
                cd = st.number_input("Cadmio - Cd (ppm)", min_value=0.0, value=None)
                as_ppm = st.number_input("Arsénico - As (ppm)", min_value=0.0, value=None)
                petrografia = st.selectbox("Textura Dominante (Petrografía)", ["Micrítica de grano fino", "Esparítica de grano grueso"])

            extras_man = campos_ensayos_opcionales("man_")

            submit_button = st.form_submit_button(label="Calcular LSF y Evaluar Muestra")

        if submit_button:
            if muestra_id == "":
                st.error("Por favor, asigne un ID a la muestra.")
            else:
                # Guardar los argumentos en sesión: los resultados sobreviven a los
                # reruns de Streamlit (cambiar de pestaña, tocar un widget, etc.)
                st.session_state["eval_manual"] = dict(
                    muestra_id=muestra_id, caco3=caco3, cao=cao, mgo=mgo, sio2=sio2,
                    fe2o3=fe2o3, al2o3=al2o3, so3=so3, na2o=na2o, k2o=k2o, p2o5=p2o5,
                    pb=pb, cd=cd, as_ppm=as_ppm, drx=drx, petrografia=petrografia,
                    fuente="Entrada manual", extras=extras_man,
                )
                st.session_state["eval_manual_persistir"] = True

        if st.session_state.get("eval_manual"):
            evaluar_y_mostrar_resultados(
                **st.session_state["eval_manual"], guardar=True,
                persistir=st.session_state.pop("eval_manual_persistir", False),
            )
                
    with tab_lote:
        st.write("Cargue un archivo (.xlsx o .csv) con múltiples muestras.")
        st.caption("Columnas esperadas: 'ID Muestra', 'CaCO3', 'CaO', 'MgO', 'SiO2', 'Fe2O3', 'Al2O3', 'SO3', 'Na2O', 'K2O'")
        archivo_up = st.file_uploader("Seleccionar Archivo (Excel o CSV)", type=["xlsx", "csv"])
        if archivo_up is not None:
            try:
                if archivo_up.name.endswith(".csv"):
                    df_up = pd.read_csv(archivo_up)
                else:
                    df_up = pd.read_excel(archivo_up)
                
                st.dataframe(df_up.head())
                
                if st.button("Procesar Lote"):
                    # Normalizar nombres de columnas para tolerar variaciones ("ID de la Muestra", "CaCO3 (%)", etc.)
                    def normalize_col(c):
                        return str(c).upper().replace(" ", "").replace("(%)", "").replace("DELA", "").replace("DE", "")
                        
                    col_map = {c: normalize_col(c) for c in df_up.columns}
                    df_up_norm = df_up.rename(columns=col_map)
                    
                    for index, row in df_up_norm.iterrows():
                        id_m = row.get("IDMUESTRA")
                        if pd.isna(id_m) or str(id_m).strip() == "":
                            continue
                            
                        # Extraer variables con fallback a 0.0 si faltan columnas
                        c_cao = row.get("CAO", 0.0)
                        c_sio2 = row.get("SIO2", 0.0)
                        
                        # Mostrar evaluación para cada uno
                        st.markdown(f"### Evaluación: {id_m}")
                        evaluar_y_mostrar_resultados(
                            str(id_m),
                            row.get("CACO3", 0.0), c_cao, row.get("MGO", 0.0),
                            c_sio2, row.get("FE2O3", 0.0), row.get("AL2O3", 0.0),
                            row.get("SO3", 0.0), row.get("NA2O", 0.0), row.get("K2O", 0.0),
                            row.get("P2O5", 0.0), row.get("PB", 0.0), row.get("CD", 0.0), row.get("AS", 0.0),
                            str(row.get("DRX", "Calcita")), str(row.get("PETROGRAFIA", "Micrítica de grano fino")),
                            guardar=True, fuente=archivo_up.name
                        )
            except Exception as e:
                st.error(f"Error al procesar el archivo: {e}")

    with tab_img:
        st.write("Cargue uno o varios PDFs del laboratorio (recomendado), o una imagen de resultados.")
        archivos = st.file_uploader("Seleccionar PDF(s) o Imagen", type=["pdf", "png", "jpg", "jpeg"], accept_multiple_files=True)

        api_key = st.text_input("API Key de Google Gemini (Opcional, recomendada para gráficos complejos)", type="password", help="Obtén tu API Key gratuita en Google AI Studio para una lectura perfecta.")

        if "ocr_data" not in st.session_state:
            st.session_state["ocr_data"] = None

        hay_pdf = any(f.name.lower().endswith(".pdf") for f in archivos) if archivos else False
        convertir = True
        loi_manual = 0.0
        if hay_pdf:
            convertir = st.checkbox(
                "Convertir de base calcinada a base seca (reportes XRF)", value=True,
                help="El XRF reporta óxidos que suman ~100% sin LOI. La conversión recalcula a base seca y estima el CaCO3 equivalente."
            )
            if convertir:
                loi_manual = st.number_input("LOI medido (%) — deje 0 para estimarlo estequiométricamente", min_value=0.0, max_value=60.0, value=0.0, format="%.2f")

        def procesar_pdf(archivo):
            datos, texto = extraer_datos_pdf(archivo)
            if datos and convertir and es_base_calcinada(datos):
                datos = convertir_base_seca(datos, loi_manual or None)
            return datos, texto

        img_up = archivos[0] if archivos and len(archivos) == 1 else None
        imagen_ocr = None

        if archivos and len(archivos) > 1:
            # --- Modo lote: varios PDFs de una vez ---
            filas = []
            for f in archivos:
                if not f.name.lower().endswith(".pdf"):
                    st.warning(f"'{f.name}': el modo lote solo procesa PDFs; omitido.")
                    continue
                try:
                    d, _ = procesar_pdf(f)
                except Exception as e:
                    st.warning(f"'{f.name}': error al leer ({e}); omitido.")
                    continue
                if not d:
                    st.warning(f"'{f.name}': sin tabla de resultados (¿es el espectro?); omitido.")
                    continue
                filas.append({
                    "Archivo": f.name,
                    "ID Muestra": d.get("muestra_id") or f.name.rsplit(".", 1)[0],
                    **{k: d.get(k, 0.0) for k in ("caco3",) + OXIDOS + ("pb", "cd", "as_ppm")},
                })
            if filas:
                st.info(f"{len(filas)} reporte(s) extraído(s). Revise y corrija los valores (la tabla es editable) antes de guardar:")
                df_lote_pdf = st.data_editor(pd.DataFrame(filas), hide_index=True)
                if st.button("Evaluar y Guardar Todas las Muestras"):
                    for _, fila in df_lote_pdf.iterrows():
                        st.markdown(f"### Evaluación: {fila['ID Muestra']}")
                        evaluar_y_mostrar_resultados(
                            str(fila["ID Muestra"]), fila["caco3"], fila["cao"], fila["mgo"],
                            fila["sio2"], fila["fe2o3"], fila["al2o3"], fila["so3"],
                            fila["na2o"], fila["k2o"], pb=fila["pb"], cd=fila["cd"], as_ppm=fila["as_ppm"],
                            guardar=True, fuente=str(fila["Archivo"]),
                        )
        elif img_up is not None and img_up.name.lower().endswith(".pdf"):
            # PDF digital: se lee la capa de texto directamente, sin OCR ni IA
            try:
                # Si cambió el archivo (o la conversión), limpiar resultados de la muestra anterior
                firma_pdf = (img_up.name, img_up.size, convertir, loi_manual)
                if st.session_state.get("firma_pdf") != firma_pdf:
                    st.session_state.pop("eval_ocr", None)
                    st.session_state["firma_pdf"] = firma_pdf
                datos_pdf, texto_pdf = procesar_pdf(img_up)
                st.session_state["raw_ocr_text"] = texto_pdf
                if datos_pdf:
                    st.session_state["ocr_data"] = datos_pdf
                    st.success("✅ Datos extraídos directamente del PDF (sin OCR). Revíselos abajo antes de guardar.")
                    if "loi_estimado" in datos_pdf:
                        origen = "medido" if loi_manual else "estimado"
                        st.info(f"Convertido a base seca (LOI {origen}: {datos_pdf['loi_estimado']}%). CaCO3 estimado: {datos_pdf['caco3']}%.")
                    elif datos_pdf.get("caco3", 0.0) == 0.0:
                        st.info("El reporte XRF no incluye CaCO3. Complételo manualmente en el formulario.")
                elif texto_pdf.strip():
                    st.session_state["ocr_data"] = None
                    st.error("Este PDF no contiene la tabla de resultados (¿es solo el espectro?). Suba el reporte 'Sample results'.")
                else:
                    # PDF escaneado sin capa de texto: rescatar la imagen embebida y pasarla al flujo OCR
                    from pypdf import PdfReader
                    img_up.seek(0)
                    paginas = PdfReader(img_up).pages
                    if paginas and paginas[0].images:
                        imagen_ocr = Image.open(io.BytesIO(paginas[0].images[0].data))
                        st.info("PDF escaneado (sin capa de texto): se procesará como imagen con OCR/IA.")
                    else:
                        st.error("PDF sin texto ni imagen extraíble. Intente con una captura de pantalla del reporte.")
            except Exception as e:
                st.error(f"Error al leer el PDF: {e}")
        elif img_up is not None:
            imagen_ocr = Image.open(img_up)

        if imagen_ocr is not None:
            image = imagen_ocr
            st.image(image, caption="Imagen cargada", use_container_width=True)
            
            if st.button("Extraer Datos (IA / OCR)"):
                st.session_state.pop("eval_ocr", None)
                with st.spinner("Procesando imagen..."):
                    texto_extraido = ""
                    
                    if api_key and genai is not None:
                        # Extraer con IA Visual Avanzada (Gemini)
                        try:
                            client = genai.Client(api_key=api_key)
                            
                            valid_models = []
                            try:
                                for m in client.models.list():
                                    name = m.name.replace('models/', '') if m.name.startswith('models/') else m.name
                                    if 'flash' in name or 'pro' in name:
                                        valid_models.append(name)
                            except Exception as e:
                                raise Exception(f"Error al verificar tu cuenta: {e}")
                                
                            if not valid_models:
                                raise Exception("Tu API Key es válida, pero tu cuenta de Google no tiene acceso habilitado a los modelos Gemini. Verifica los permisos de la llave en AI Studio.")
                                
                            prompt = "Extract the chemical composition data from this chart or table. Return ONLY a pure JSON object (no markdown, no quotes) with these exact lowercase keys, using float numbers (0.0 if not found): caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o. Example: {\"cao\": 48.0, \"sio2\": 12.0}"
                            
                            response = None
                            last_e = None
                            
                            for m_name in reversed(valid_models):
                                try:
                                    response = client.models.generate_content(
                                        model=m_name,
                                        contents=[prompt, image]
                                    )
                                    break
                                except Exception as e:
                                    last_e = e
                                    
                            if response is None:
                                raise Exception(f"Se intentó usar {len(valid_models)} modelos permitidos pero todos fallaron. Último error ({valid_models[-1] if valid_models else 'ninguno'}): {last_e}")
                                
                            texto_extraido = response.text
                            
                            try:
                                js = json.loads(texto_extraido.replace('```json', '').replace('```', '').strip())
                                st.session_state["raw_ocr_text"] = "JSON extraído con IA:\n" + json.dumps(js, indent=2)
                                st.session_state["ocr_data"] = {
                                    "caco3": float(js.get("caco3", 0.0)),
                                    "cao": float(js.get("cao", 0.0)),
                                    "sio2": float(js.get("sio2", 0.0)),
                                    "al2o3": float(js.get("al2o3", 0.0)),
                                    "fe2o3": float(js.get("fe2o3", 0.0)),
                                    "mgo": float(js.get("mgo", 0.0)),
                                    "so3": float(js.get("so3", 0.0)),
                                    "na2o": float(js.get("na2o", 0.0)),
                                    "k2o": float(js.get("k2o", 0.0))
                                }
                            except Exception as json_e:
                                st.warning(f"Error parseando respuesta de la IA: {json_e}")
                        except Exception as ai_e:
                            st.error(f"Error conectando con Gemini API: {ai_e}")
                    else:
                        # Fallback a Tesseract OCR (Básico)
                        st.warning("⚠️ No ingresaste una API Key de Gemini. Se está utilizando el método básico (Tesseract) que no puede leer correctamente este tipo de gráficos. Por favor, pega tu llave arriba para usar la IA.")
                        if pytesseract is not None:
                            tess_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
                            tess_path_x86 = r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
                            if os.path.exists(tess_path):
                                pytesseract.pytesseract.tesseract_cmd = tess_path
                            elif os.path.exists(tess_path_x86):
                                pytesseract.pytesseract.tesseract_cmd = tess_path_x86
                                
                            try:
                                texto_extraido = pytesseract.image_to_string(image)
                            except Exception as e:
                                st.warning("Error con Tesseract local. Verifique su instalación.")
                        else:
                            st.warning("pytesseract no está instalado en este entorno, se simulará la extracción.")
                    
                    def extract_val(pattern, text):
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            try:
                                return float(match.group(1).replace(',','.'))
                            except:
                                return 0.0
                        return 0.0

                    st.session_state["raw_ocr_text"] = texto_extraido
                    
                    # Convertir saltos de línea a espacios para buscar horizontalmente
                    t = texto_extraido.replace('\n', ' ')
                    
                    st.session_state["ocr_data"] = {
                        "caco3": extract_val(r'CaCO.{0,15}?(\d+[\.,]\d+)', t),
                        "cao": extract_val(r'CaO.{0,15}?(\d+[\.,]\d+)', t),
                        "sio2": extract_val(r'SiO.{0,15}?(\d+[\.,]\d+)', t),
                        "al2o3": extract_val(r'Al.{0,15}?(\d+[\.,]\d+)', t),
                        "fe2o3": extract_val(r'Fe.{0,15}?(\d+[\.,]\d+)', t),
                        "mgo": extract_val(r'Mg.{0,15}?(\d+[\.,]\d+)', t),
                        "so3": extract_val(r'SO.{0,15}?(\d+[\.,]\d+)', t),
                        "na2o": extract_val(r'Na.{0,15}?(\d+[\.,]\d+)', t),
                        "k2o": extract_val(r'K.{0,15}?(\d+[\.,]\d+)', t)
                    }
                    
        if st.session_state["ocr_data"] is not None and not (archivos and len(archivos) > 1):
            st.info("Revisa y corrige los datos extraídos antes de guardar:")
            for aviso in validar_extraccion(st.session_state["ocr_data"]):
                st.warning(f"⚠️ {aviso}")
            with st.expander("Ver texto sin formato extraído por OCR (Debug)"):
                st.text(st.session_state.get("raw_ocr_text", "No se extrajo texto."))
            with st.form("form_ocr"):
                col_o1, col_o2 = st.columns(2)
                ocr_d = st.session_state["ocr_data"]
                with col_o1:
                    m_id_o = st.text_input("ID Muestra (OCR)", value=str(ocr_d.get("muestra_id") or "OCR-001"))
                    caco3_o = st.number_input("CaCO3 (%)", value=float(ocr_d.get("caco3", 0.0)), format="%.2f")
                    cao_o = st.number_input("CaO (%)", value=float(ocr_d.get("cao", 0.0)), format="%.2f")
                    mgo_o = st.number_input("MgO (%)", value=float(ocr_d.get("mgo", 0.0)), format="%.2f")
                    sio2_o = st.number_input("SiO2 (%)", value=float(ocr_d.get("sio2", 0.0)), format="%.2f")
                    fe2o3_o = st.number_input("Fe2O3 (%)", value=float(ocr_d.get("fe2o3", 0.0)), format="%.2f")
                    p2o5_o = st.number_input("P2O5 (%)", value=0.0, format="%.2f")
                    drx_o = st.selectbox("Fase Mineral Dominante (DRX) - OCR", ["Calcita", "Calcita Magnesiana", "Dolomita"])
                with col_o2:
                    al2o3_o = st.number_input("Al2O3 (%)", value=float(ocr_d.get("al2o3", 0.0)), format="%.2f")
                    so3_o = st.number_input("SO3 (%)", value=float(ocr_d.get("so3", 0.0)), format="%.2f")
                    na2o_o = st.number_input("Na2O (%)", value=float(ocr_d.get("na2o", 0.0)), format="%.2f")
                    k2o_o = st.number_input("K2O (%)", value=float(ocr_d.get("k2o", 0.0)), format="%.2f")
                    pb_o = st.number_input("Pb (ppm) - OCR", value=float(ocr_d.get("pb", 0.0)))
                    cd_o = st.number_input("Cd (ppm) - OCR", value=float(ocr_d.get("cd", 0.0)))
                    as_o = st.number_input("As (ppm) - OCR", value=float(ocr_d.get("as_ppm", 0.0)))
                    petrografia_o = st.selectbox("Textura Dominante (Petrografía) - OCR", ["Micrítica de grano fino", "Esparítica de grano grueso"])

                extras_ocr = campos_ensayos_opcionales("ocr_")

                submit_ocr = st.form_submit_button("Calcular LSF y Evaluar Muestra")
                if submit_ocr:
                    st.session_state["eval_ocr"] = dict(
                        muestra_id=m_id_o, caco3=caco3_o, cao=cao_o, mgo=mgo_o, sio2=sio2_o,
                        fe2o3=fe2o3_o, al2o3=al2o3_o, so3=so3_o, na2o=na2o_o, k2o=k2o_o,
                        p2o5=p2o5_o, pb=pb_o, cd=cd_o, as_ppm=as_o, drx=drx_o, petrografia=petrografia_o,
                        fuente=img_up.name if img_up is not None else "", extras=extras_ocr,
                    )
                    st.session_state["eval_ocr_persistir"] = True

            if st.session_state.get("eval_ocr"):
                evaluar_y_mostrar_resultados(
                    **st.session_state["eval_ocr"], guardar=True,
                    persistir=st.session_state.pop("eval_ocr_persistir", False),
                )

elif modo == "Consultar Historial":
    st.write("### Base de Datos de Muestras")
    archivo = "BaseDatos_Calizas.xlsx"
    if os.path.exists(archivo):
        try:
            df = pd.read_excel(archivo)
            if not df.empty and "ID Muestra" in df.columns:
                # Vista general de la base con las columnas clave primero
                cols_clave = [c for c in ("ID Muestra", "Estado Evaluacion", "CaCO3 (%)", "CaO (%)", "MgO (%)", "SiO2 (%)", "LSF", "Fecha Registro", "Archivo Fuente") if c in df.columns]
                otras = [c for c in df.columns if c not in cols_clave]
                st.dataframe(df[cols_clave + otras], hide_index=True)

                with open(archivo, "rb") as fx:
                    st.download_button("⬇️ Descargar base de datos (Excel)", data=fx.read(),
                                       file_name="BaseDatos_Calizas.xlsx",
                                       mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

                st.write("---")
                muestras_ids = df["ID Muestra"].dropna().unique().tolist()
                seleccion = st.selectbox("Ver evaluación completa de una muestra", muestras_ids)

                if seleccion:
                    # Última evaluación de la muestra seleccionada (sin botón: el
                    # selectbox dispara el re-render solo)
                    row = df[df["ID Muestra"] == seleccion].iloc[-1]
                    
                    evaluar_y_mostrar_resultados(
                        seleccion,
                        row.get("CaCO3 (%)", 0.0),
                        row.get("CaO (%)", 0.0),
                        row.get("MgO (%)", 0.0),
                        row.get("SiO2 (%)", 0.0),
                        row.get("Fe2O3 (%)", 0.0),
                        row.get("Al2O3 (%)", 0.0),
                        row.get("SO3 (%)", 0.0),
                        row.get("Na2O (%)", 0.0),
                        row.get("K2O (%)", 0.0),
                        row.get("P2O5 (%)", 0.0),
                        row.get("Pb (ppm)", 0.0),
                        row.get("Cd (ppm)", 0.0),
                        row.get("As (ppm)", 0.0),
                        row.get("DRX", "Calcita"),
                        row.get("Petrografía", "Micrítica de grano fino"),
                        guardar=False,
                        loi=row.get("LOI (%)", 0.0),
                        res_insol=row.get("Residuo Insoluble (%)", 0.0),
                        alcalis=row.get("Alcalis (Na2Oeq) (%)", 0.0)
                    )
            else:
                st.info("La base de datos está vacía o no tiene el formato correcto.")
        except Exception as e:
            st.error(f"Error al leer la base de datos: {e}")
    else:
        st.warning("No se encontró la base de datos (BaseDatos_Calizas.xlsx). Evalúe una nueva muestra primero.")
