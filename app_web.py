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

# --- Configuración de la página ---
st.set_page_config(page_title="Evaluación de Calizas", layout="centered")

# --- Función de Base de Datos ---
def guardar_en_excel(datos, archivo="BaseDatos_Calizas.xlsx"):
    df_nuevo = pd.DataFrame([datos])
    if os.path.exists(archivo):
        df_existente = pd.read_excel(archivo)
        df_final = pd.concat([df_existente, df_nuevo], ignore_index=True)
    else:
        df_final = df_nuevo
    df_final.to_excel(archivo, index=False)

def evaluar_y_mostrar_resultados(muestra_id, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o=0.0, k2o=0.0, p2o5=0.0, pb=0.0, cd=0.0, as_ppm=0.0, drx="Calcita", petrografia="Micrítica de grano fino", guardar=True, loi=0.0, res_insol=0.0, alcalis=0.0):
    # Convertir posibles None/NaN a 0.0 para cálculos seguros y redondear
    def safe_float(val):
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return 0.0
        return round(float(val), 2)

    caco3 = safe_float(caco3)
    cao = safe_float(cao)
    mgo = safe_float(mgo)
    sio2 = safe_float(sio2)
    fe2o3 = safe_float(fe2o3)
    al2o3 = safe_float(al2o3)
    so3 = safe_float(so3)
    na2o = safe_float(na2o)
    k2o = safe_float(k2o)
    p2o5 = safe_float(p2o5)
    pb = safe_float(pb)
    cd = safe_float(cd)
    as_ppm = safe_float(as_ppm)
    
    if guardar:
        loi = (cao * 0.785) + (mgo * 1.092)
        res_insol = sio2 * 0.85
        alcalis = na2o + (0.658 * k2o)
    else:
        loi = safe_float(loi)
        res_insol = safe_float(res_insol)
        alcalis = safe_float(alcalis)

    # Calcular LSF (Evitar división por cero)
    denom_lsf = (2.8 * sio2) + (1.2 * al2o3) + (0.65 * fe2o3)
    lsf = cao / denom_lsf if denom_lsf > 0 else 0
    
    # Módulo de Sílice (SM)
    denom_sm = al2o3 + fe2o3
    sm = sio2 / denom_sm if denom_sm > 0 else 0
    
    # Módulo de Alúmina (AM)
    am = al2o3 / fe2o3 if fe2o3 > 0 else 0
    
    # Interpretaciones SM/AM
    if 2.0 <= sm <= 3.0:
        interp_sm = "Adecuado"
    elif sm > 3.0:
        interp_sm = "Mezcla difícil de clinkerizar"
    else:
        interp_sm = "Bajo (Fuera de rango óptimo)"
        
    if 1.3 <= am <= 2.5:
        interp_am = "Óptimo industrial"
    else:
        interp_am = "Fuera de rango óptimo"
    
    # --- Cálculo de Fases Minerales (Ecuaciones de Bogue) ---
    c3s = (4.071 * cao) - (7.600 * sio2) - (6.718 * al2o3) - (1.430 * fe2o3) - (2.852 * so3)
    c3s = max(0.0, round(c3s, 2))
    
    c2s = (2.867 * sio2) - (0.7544 * c3s)
    c2s = max(0.0, round(c2s, 2))
    
    c3a = (2.650 * al2o3) - (1.692 * fe2o3)
    c3a = max(0.0, round(c3a, 2))
    
    c4af = 3.043 * fe2o3
    c4af = max(0.0, round(c4af, 2))

    # --- Evaluaciones Geológicas / Óxidos ---
    advertencias_geol = []
    if caco3 < 75:
        advertencias_geol.append(f"CaCO3 de {caco3}% está por debajo del recomendado (>75%).")
    if not (45 <= cao <= 52):
        advertencias_geol.append(f"CaO de {cao}% está fuera del rango óptimo (45-52%).")
    if not (5 <= sio2 <= 15):
        advertencias_geol.append(f"SiO2 de {sio2}% está fuera del rango recomendado (5-15%).")
    if not (1 <= fe2o3 <= 5):
        advertencias_geol.append(f"Fe2O3 de {fe2o3}% está fuera del rango recomendado (1-5%).")
    if not (1 <= al2o3 <= 6):
        advertencias_geol.append(f"Al2O3 de {al2o3}% está fuera del rango recomendado (1-6%).")

    # --- Interpretación Regional (Calizas del Cesar) ---
    interp_cesar = []
    if cao >= 45.0 and sio2 <= 15.0 and mgo <= 5.0:
        interp_cesar.append("✅ Depósito Favorable: Alto CaO, baja sílice y bajo MgO.")

    if mgo > 5.0:
        interp_cesar.append("⚠️ Problemático - Dolomitización: Presencia de MgO alto.")

    if sio2 > 15.0 and al2o3 > 6.0:
        interp_cesar.append("⚠️ Problemático - Intercalaciones arcillosas: Niveles altos de SiO2 y Al2O3.")
    elif sio2 > 15.0 and al2o3 <= 6.0:
        interp_cesar.append("⚠️ Problemático - Chert: Sílice excesiva.")
        
    if not interp_cesar:
        interp_cesar.append("ℹ️ Condiciones geológicas intermedias u ordinarias.")

    # --- Evaluaciones de Calidad ASTM C150 / NTC 321 ---
    errores_norma = []
    cumple_norma = True
    
    if mgo > 5.0:
        cumple_norma = False
        errores_norma.append(f"MgO ({mgo}%): Supera el límite de 5.0%. Importancia: Evita la expansión perjudicial en el cemento endurecido.")
        
    if so3 > 3.5:
        cumple_norma = False
        errores_norma.append(f"SO3 ({so3}%): Supera el límite de 3.5%. Importancia: Controla el tiempo de fraguado y evita expansiones tardías.")
    elif so3 < 3.0:
        advertencias_geol.append(f"SO3 ({so3}%) está por debajo del mínimo recomendado (3.0%). Importancia: Controla el tiempo de fraguado.")
        
    if loi > 3.0:
        cumple_norma = False
        errores_norma.append(f"LOI ({loi}%): Supera el límite de 3.0%. Importancia: Indica una posible prehidratación o carbonatación indeseada.")
        
    if res_insol > 0.75:
        cumple_norma = False
        errores_norma.append(f"Residuo Insoluble ({res_insol}%): Supera el límite de 0.75%. Importancia: Control de impurezas (cuarzo u otros silicatos no reactivos).")
        
    if alcalis > 0.6:
        cumple_norma = False
        errores_norma.append(f"Álcalis ({alcalis}%): Supera el límite de 0.6%. Importancia: Previene la reacción álcali-agregado nociva en el hormigón.")

    estado_eval = "APTO" if cumple_norma else "NO APTO"

    # --- Motor de Dictamen Normativo (5 Perfiles) ---
    perfil_a = {"nombre": "Industria del Cemento", "norma": "NTC 121 y NTC 321", "estado": "Apto", "razon": ""}
    if mgo >= 5.0:
        perfil_a["estado"] = "No Apto"
        perfil_a["razon"] = f"MgO ({mgo}%) excede límite 5% (expansión)."
    elif alcalis > 0.6:
        perfil_a["estado"] = "No Apto"
        perfil_a["razon"] = f"Álcalis ({alcalis}%) exceden 0.6%."
    elif so3 > 3.5:
        perfil_a["estado"] = "No Apto"
        perfil_a["razon"] = f"SO3 ({so3}%) excede 3.5%."
    elif p2o5 > 0.5:
        perfil_a["estado"] = "No Apto"
        perfil_a["razon"] = f"P2O5 ({p2o5}%) por encima de trazas."
    
    perfil_b = {"nombre": "Uso Agrícola", "norma": "NTC 1927", "estado": "Apto", "razon": "Buen aporte neutralizante."}
    if pb > 100 or cd > 39 or as_ppm > 41:
        perfil_b["estado"] = "No Apto"
        perfil_b["razon"] = "Exceso de metales pesados (Pb, Cd o As)."
    elif mgo > 9.0:
        perfil_b["estado"] = "Apto con Condicionamiento"
        perfil_b["razon"] = "Cal Dolomítica de alto valor agrícola."
    
    perfil_c = {"nombre": "Agregados para Construcción", "norma": "NTC 174 e INVIAS", "estado": "Apto", "razon": "Requiere revisión petrográfica manual."}
    if cao > 45 and sio2 < 15:
        perfil_c["estado"] = "Apto con Condicionamiento"
        perfil_c["razon"] = "Apta para cemento; uso como agregado requiere validar dureza."
    else:
        perfil_c["estado"] = "Apto"
        perfil_c["razon"] = "Caliza silícea. Validar dureza física."
        
    perfil_d = {"nombre": "Siderúrgica (Fundentes)", "norma": "ASTM C911", "estado": "Apto", "razon": ""}
    if caco3 <= 95:
        perfil_d["estado"] = "No Apto"
        perfil_d["razon"] = f"CaCO3 ({caco3}%) no supera el 95%."
    elif sio2 >= 1.5:
        perfil_d["estado"] = "No Apto"
        perfil_d["razon"] = f"SiO2 ({sio2}%) mayor o igual a 1.5%."
    elif so3 > 0.5 or p2o5 > 0.1:
        perfil_d["estado"] = "No Apto"
        perfil_d["razon"] = "Azufre o fósforo por encima de trazas."
        
    perfil_e = {"nombre": "Usos Químicos (Vidrio)", "norma": "ASTM C25", "estado": "Apto", "razon": ""}
    if fe2o3 > 0.1:
        perfil_e["estado"] = "No Apto"
        perfil_e["razon"] = f"Fe2O3 ({fe2o3}%) excede 0.1% (tiñe el vidrio)."

    dictamenes_calc = [perfil_a, perfil_b, perfil_c, perfil_d, perfil_e]

    # --- Guardar en Excel si corresponde ---
    if guardar:
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
            "Dictamen Cemento": perfil_a["estado"],
            "Dictamen Agrícola": perfil_b["estado"],
            "Dictamen Agregados": perfil_c["estado"],
            "Dictamen Siderúrgica": perfil_d["estado"],
            "Dictamen Vidrio": perfil_e["estado"]
        }
        try:
            guardar_en_excel(datos)
            st.success(f"Muestra '{muestra_id}' evaluada y registrada con éxito en Excel.")
        except PermissionError:
            st.error("Error al escribir en Excel: El archivo 'BaseDatos_Calizas.xlsx' está abierto. Por favor, ciérrelo e intente de nuevo.")
            st.stop()
    else:
        st.info(f"Mostrando registro histórico para la muestra '{muestra_id}'.")

    # --- Mostrar Conclusiones en Pantalla ---
    st.write("---")
    st.subheader("Conclusiones de la Evaluación")
    
    st.subheader("Parámetros Calculados")
    col_c1, col_c2, col_c3 = st.columns(3)
    with col_c1:
        st.metric(label="LOI Calculado (%)", value=f"{round(loi, 3)}")
    with col_c2:
        st.metric(label="Residuo Insoluble Calc. (%)", value=f"{round(res_insol, 3)}")
    with col_c3:
        st.metric(label="Álcalis Equivalentes (%)", value=f"{round(alcalis, 3)}")
    
    st.subheader("Módulos de Control Químico")
    col_mod1, col_mod2, col_mod3 = st.columns(3)
    with col_mod1:
        st.metric(label="Saturación de Cal (LSF)", value=f"{round(lsf, 3)}")
    with col_mod2:
        st.metric(label="Módulo de Sílice (SM)", value=f"{round(sm, 3)}")
        if interp_sm == "Adecuado":
            st.success(interp_sm)
        elif interp_sm == "Mezcla difícil de clinkerizar":
            st.error(interp_sm)
        else:
            st.warning(interp_sm)
    with col_mod3:
        st.metric(label="Módulo de Alúmina (AM)", value=f"{round(am, 3)}")
        if interp_am == "Óptimo industrial":
            st.success(interp_am)
        else:
            st.warning(interp_am)
    
    st.write("---")
    st.subheader("Mineralogía Potencial del Clinker (Bogue)")
    col_m1, col_m2 = st.columns(2)
    with col_m1:
        st.metric("Alita (C3S)", f"{c3s}%")
        st.caption("Aporta la resistencia temprana")
        st.metric("Aluminato Tricálcico (C3A)", f"{c3a}%")
        st.caption("Responsable del fraguado rápido")
    with col_m2:
        st.metric("Belita (C2S)", f"{c2s}%")
        st.caption("Aporta la resistencia tardía")
        st.metric("Ferroaluminato (C4AF)", f"{c4af}%")
        st.caption("Actúa como fundente en el horno")
    st.write("---")
    
    st.subheader("Interpretación Geoquímica (Calizas del Cesar)")
    for interp in interp_cesar:
        if "✅" in interp:
            st.success(interp)
        elif "⚠️" in interp:
            st.warning(interp)
        else:
            st.info(interp)
            
    st.write("---")

    if cumple_norma:
        st.success("🏆 APTITUD DE LA CALIZA: APTO para Cemento Portland")
        st.info("La muestra cumple satisfactoriamente con los límites máximos establecidos por la norma ASTM C150 y NTC 321.")
    else:
        st.error("❌ APTITUD DE LA CALIZA: NO APTO para Cemento Portland")
        st.warning("Se detectaron valores que exceden los límites normativos obligatorios:")
        for err in errores_norma:
            st.write(f"- {err}")
            
    # Mostrar advertencias geológicas / de recomendación (no excluyentes)
    if advertencias_geol:
        with st.expander("Ver observaciones de rangos recomendados y sugerencias"):
            for adv in advertencias_geol:
                st.write(f"⚠️ {adv}")

    st.write("---")
    st.subheader("Reporte de Conclusión Textual")
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

    st.write("---")
    st.subheader("Motor de Dictamen Normativo (Sectores Industriales)")
    
    if "Micrítica" in petrografia:
        st.info(f"🔬 **Análisis Petrográfico ({petrografia}):** Al ser una caliza micrítica, reaccionará más rápido en el horno que una esparítica, favoreciendo la clinkerización.")
    elif "Esparítica" in petrografia:
        st.info(f"🔬 **Análisis Petrográfico ({petrografia}):** Al ser una caliza esparítica, presenta cristales más grandes, lo que puede requerir mayor temperatura o tiempo de residencia en el horno para reaccionar completamente.")
    
    cols = st.columns(3)
    for i, perfil in enumerate(dictamenes_calc):
        col = cols[i % 3]
        with col:
            st.markdown(f"**{perfil['nombre']}**")
            st.caption(f"Norma: {perfil['norma']}")
            if perfil["estado"] == "Apto":
                st.success("✅ Apto")
                st.write(perfil["razon"])
            elif perfil["estado"] == "Apto con Condicionamiento":
                st.warning(f"⚠️ {perfil['estado']}")
                st.write(perfil["razon"])
            else:
                st.error(f"❌ No Apto")
                st.write(perfil["razon"])
            st.write("---")


# --- Interfaz Web ---
st.title("Evaluación Geoquímica de Calizas")
st.subheader("Módulo Cemento Portland (ASTM C150 / NTC 321)")

modo = st.sidebar.radio("Modo de Operación", ["Evaluar Nueva Muestra", "Consultar Historial"])

if modo == "Evaluar Nueva Muestra":
    tab_manual, tab_lote, tab_img = st.tabs(["Entrada Manual", "Carga por Lote (Excel/CSV)", "Procesar Imagen (OCR)"])
    
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
    
            submit_button = st.form_submit_button(label="Calcular LSF y Evaluar Muestra")
    
        if submit_button:
            if muestra_id == "":
                st.error("Por favor, asigne un ID a la muestra.")
            else:
                evaluar_y_mostrar_resultados(
                    muestra_id, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm, drx, petrografia, guardar=True
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
                            guardar=True
                        )
            except Exception as e:
                st.error(f"Error al procesar el archivo: {e}")

    with tab_img:
        st.write("Cargue una imagen de resultados de laboratorio o un difractograma para extraer datos (OCR).")
        img_up = st.file_uploader("Seleccionar Imagen", type=["png", "jpg", "jpeg"])
        
        api_key = st.text_input("API Key de Google Gemini (Opcional, recomendada para gráficos complejos)", type="password", help="Obtén tu API Key gratuita en Google AI Studio para una lectura perfecta.")
        
        if "ocr_data" not in st.session_state:
            st.session_state["ocr_data"] = None
            
        if img_up is not None:
            image = Image.open(img_up)
            st.image(image, caption="Imagen cargada", use_container_width=True)
            
            if st.button("Extraer Datos (IA / OCR)"):
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
                    
        if st.session_state["ocr_data"] is not None:
            st.info("Revisa y corrige los datos extraídos antes de guardar:")
            with st.expander("Ver texto sin formato extraído por OCR (Debug)"):
                st.text(st.session_state.get("raw_ocr_text", "No se extrajo texto."))
            with st.form("form_ocr"):
                col_o1, col_o2 = st.columns(2)
                ocr_d = st.session_state["ocr_data"]
                with col_o1:
                    m_id_o = st.text_input("ID Muestra (OCR)", value="OCR-001")
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
                    pb_o = st.number_input("Pb (ppm) - OCR", value=0.0)
                    cd_o = st.number_input("Cd (ppm) - OCR", value=0.0)
                    as_o = st.number_input("As (ppm) - OCR", value=0.0)
                    petrografia_o = st.selectbox("Textura Dominante (Petrografía) - OCR", ["Micrítica de grano fino", "Esparítica de grano grueso"])
                    
                submit_ocr = st.form_submit_button("Calcular LSF y Evaluar Muestra")
                if submit_ocr:
                    evaluar_y_mostrar_resultados(
                        m_id_o, caco3_o, cao_o, mgo_o, sio2_o, fe2o3_o, al2o3_o, so3_o, na2o_o, k2o_o, p2o5_o, pb_o, cd_o, as_o, drx_o, petrografia_o, guardar=True
                    )

elif modo == "Consultar Historial":
    st.write("### Base de Datos de Muestras")
    archivo = "BaseDatos_Calizas.xlsx"
    if os.path.exists(archivo):
        try:
            df = pd.read_excel(archivo)
            if not df.empty and "ID Muestra" in df.columns:
                muestras_ids = df["ID Muestra"].dropna().unique().tolist()
                seleccion = st.selectbox("Seleccione ID de Muestra a consultar", muestras_ids)
                
                if st.button("Cargar Observaciones"):
                    # Extraer última evaluación de la muestra seleccionada
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
