"""Lógica de cálculo y persistencia compartida entre app_web.py y app_escritorio.py."""
import math
import os
import pandas as pd

ARCHIVO_EXCEL = "BaseDatos_Calizas.xlsx"


def safe_float(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return 0.0
    return round(float(val), 2)


OXIDOS = ("cao", "mgo", "sio2", "fe2o3", "al2o3", "so3", "na2o", "k2o")


def parsear_reporte_xrf(texto):
    """Parsea el texto de un reporte XRF (formato Panalytical/Omnian) con bloques
    Compound / Conc / Unit. Devuelve dict con los campos de la app, o None si no hay tabla."""
    comp = {}
    lineas = [l.split() for l in texto.splitlines()]
    for i, tokens in enumerate(lineas):
        if tokens[:1] == ["Compound"]:
            nombres = tokens[1:]
            conc = unidades = None
            for t2 in lineas[i + 1:i + 4]:
                if t2[:1] == ["Conc"]:
                    conc = t2[1:]
                elif t2[:1] == ["Unit"]:
                    unidades = t2[1:]
            if conc and unidades:
                for n, c, u in zip(nombres, conc, unidades):
                    try:
                        comp[n] = (float(c.replace(",", ".")), u)
                    except ValueError:
                        pass
    if not comp:
        return None

    def pct(nombre):
        v, u = comp.get(nombre, (0.0, "%"))
        return round(v / 10000, 4) if u == "ppm" else v

    def ppm(nombre):
        v, u = comp.get(nombre, (0.0, "ppm"))
        return v * 10000 if u == "%" else v

    # ID de muestra: en el formato Omnian aparece en la línea anterior (o siguiente)
    # a la etiqueta "Sample ident"
    muestra_id = ""
    raw = [l.strip() for l in texto.splitlines()]
    for i, l in enumerate(raw):
        if l == "Sample ident":
            candidatos = [x for x in reversed(raw[:i]) if x and "Sample results" not in x]
            candidatos += [x for x in raw[i + 1:i + 2] if x and len(x) < 30]
            if candidatos:
                muestra_id = candidatos[0]
            break

    return {
        "muestra_id": muestra_id,
        # El XRF reporta en base calcinada y no incluye CaCO3: se completa manualmente
        # o se estima con convertir_base_seca()
        "caco3": 0.0,
        "cao": pct("CaO"), "mgo": pct("MgO"), "sio2": pct("SiO2"),
        "fe2o3": pct("Fe2O3"), "al2o3": pct("Al2O3"), "so3": pct("SO3"),
        "na2o": pct("Na2O"), "k2o": pct("K2O"),
        "pb": ppm("Pb"), "cd": ppm("Cd"), "as_ppm": ppm("As"),
    }


def es_base_calcinada(datos):
    """Si los óxidos suman ~100%, el reporte viene en base calcinada (sin LOI)."""
    return sum(datos.get(k, 0.0) for k in OXIDOS) > 95.0


def convertir_base_seca(datos, loi=None):
    """Convierte óxidos de base calcinada (XRF, óxidos suman ~100% sin LOI) a base seca.

    Si no se pasa un LOI medido, se estima estequiométricamente asumiendo que todo el
    Ca y Mg están como carbonatos (CO2: CaO x 0.7848, MgO x 1.0919). Con el CaO seco
    se estima el CaCO3 equivalente (x 1.7848, solo calcita)."""
    if loi:
        f = (100.0 - loi) / 100.0
    else:
        co2 = datos.get("cao", 0.0) * 0.7848 + datos.get("mgo", 0.0) * 1.0919
        f = 100.0 / (100.0 + co2)
        loi = 100.0 * (1.0 - f)

    out = dict(datos)
    for k in OXIDOS + ("pb", "cd", "as_ppm"):
        out[k] = round(datos.get(k, 0.0) * f, 4)
    out["caco3"] = round(min(out["cao"] * 1.7848, 100.0), 2)
    out["loi_estimado"] = round(loi, 2)
    return out


def validar_extraccion(datos):
    """Sanity checks sobre datos extraídos de PDF/imagen. Devuelve lista de advertencias."""
    avisos = []
    suma = sum(datos.get(k, 0.0) for k in OXIDOS)
    if suma > 95.0:
        avisos.append(f"Los óxidos suman {round(suma, 1)}%: el reporte parece estar en base calcinada (sin LOI). Active la conversión a base seca.")
    faltantes = [k.upper() for k in OXIDOS if datos.get(k, 0.0) == 0.0]
    if faltantes:
        avisos.append("No encontrados en el reporte (quedaron en 0): " + ", ".join(faltantes) + ". Verifíquelos manualmente.")
    rangos = {"cao": (20, 100), "mgo": (0, 45), "sio2": (0, 60), "fe2o3": (0, 20), "al2o3": (0, 25)}
    for k, (lo, hi) in rangos.items():
        v = datos.get(k, 0.0)
        if v and not (lo <= v <= hi):
            avisos.append(f"{k.upper()} = {v}% fuera del rango plausible ({lo}-{hi}%) para una caliza. Posible error de lectura.")
    return avisos


def extraer_datos_pdf(archivo):
    """Extrae composición desde un PDF de laboratorio con capa de texto.
    Devuelve (datos, texto_crudo); datos es None si el PDF no trae la tabla
    (p. ej. el PDF del espectro, que es solo gráfico)."""
    from pypdf import PdfReader
    texto = "\n".join((p.extract_text() or "") for p in PdfReader(archivo).pages)
    return parsear_reporte_xrf(texto), texto


def guardar_en_excel(datos, archivo=ARCHIVO_EXCEL):
    df_nuevo = pd.DataFrame([datos])
    if os.path.exists(archivo):
        df_existente = pd.read_excel(archivo)
        df_final = pd.concat([df_existente, df_nuevo], ignore_index=True)
    else:
        df_final = df_nuevo
    df_final.to_excel(archivo, index=False)


# Matriz de usos industriales de caliza (umbrales de la tabla de referencia del proyecto).
# Criterio: (campo, operador, límite, etiqueta). Si el campo es None (ensayo no realizado),
# el criterio queda pendiente y el dictamen pasa a "Requiere ensayos".
PERFILES_INDUSTRIALES = [
    {"nombre": "Industria cementera", "aplicacion": "Fabricación de clinker y cemento Portland",
     "norma": "ASTM C150, ASTM C114, NTC 121, NTC 321",
     "criterios": [("caco3", ">", 75, "CaCO3 > 75%"), ("cao", ">", 42, "CaO > 42%"),
                   ("mgo", "<", 5, "MgO < 5%"), ("sio2", "<", 15, "SiO2 < 15%"),
                   ("fe2o3", "<", 5, "Fe2O3 < 5%")]},
    {"nombre": "Producción de cal viva", "aplicacion": "Obtención de CaO mediante calcinación",
     "norma": "ASTM C25, ASTM C51, ASTM C911",
     "criterios": [("caco3", ">", 95, "CaCO3 > 95%"), ("sio2", "<", 2, "SiO2 < 2%"),
                   ("mgco3", "<", 5, "MgCO3 < 5%"), ("fe2o3", "<", 1, "Fe2O3 < 1%")]},
    {"nombre": "Producción de cal hidratada", "aplicacion": "Producción de Ca(OH)2",
     "norma": "ASTM C206, ASTM C207, ASTM C911",
     "criterios": [("cao_disponible", ">", 90, "CaO disponible > 90%"), ("mgo", "<", 3, "MgO < 3%")]},
    {"nombre": "Cal agrícola", "aplicacion": "Neutralización de suelos ácidos",
     "norma": "NTC 5163, ASTM C602",
     "criterios": [("caco3_eq", ">", 80, "CaCO3 equivalente > 80%"), ("pn", ">", 80, "Poder Neutralizante > 80%")]},
    {"nombre": "Industria siderúrgica", "aplicacion": "Fundente en altos hornos",
     "norma": "ISO 12677, ASTM E1915",
     "criterios": [("caco3", ">", 90, "CaCO3 > 90%"), ("sio2", "<", 2, "SiO2 < 2%"),
                   ("p2o5", "<", 0.05, "P2O5 < 0.05%"), ("s", "<", 0.03, "S < 0.03%")]},
    {"nombre": "Industria química", "aplicacion": "Carbonato de calcio precipitado y otros compuestos",
     "norma": "ASTM C602, ISO 3262",
     "criterios": [("caco3", ">", 98, "CaCO3 > 98%"), ("fe2o3", "<", 0.05, "Fe2O3 < 0.05%"),
                   ("mgo", "<", 1, "MgO < 1%")]},
    {"nombre": "Industria del vidrio", "aplicacion": "Fabricación de vidrio",
     "norma": "ASTM C146, ISO 1288",
     "criterios": [("caco3", ">", 95, "CaCO3 > 95%"), ("fe2o3", "<", 0.05, "Fe2O3 < 0.05%")]},
    {"nombre": "Industria cerámica", "aplicacion": "Producción de cerámica y porcelana",
     "norma": "ISO 13006, ASTM C373",
     "criterios": [("caco3", ">", 90, "CaCO3 > 90%"), ("fe2o3", "<", 0.5, "Fe2O3 < 0.5%")]},
    {"nombre": "Industria del papel", "aplicacion": "Carga mineral y recubrimiento",
     "norma": "ISO 2469, ISO 2470",
     "criterios": [("caco3", ">", 98, "CaCO3 > 98%"), ("blancura", ">", 95, "Blancura > 95%"),
                   ("tamano_particula", "<", 2, "Tamaño de partícula < 2 µm")]},
    {"nombre": "Industria de pinturas", "aplicacion": "Pigmento y carga mineral",
     "norma": "ISO 3262-2, ASTM D1199",
     "criterios": [("caco3", ">", 98, "CaCO3 > 98%"), ("fe2o3", "<", 0.1, "Fe2O3 < 0.1%")],
     "nota": "Validar granulometría muy fina."},
    {"nombre": "Industria del plástico", "aplicacion": "Carga mineral para polímeros",
     "norma": "ISO 3262, ASTM D5630",
     "criterios": [("caco3", ">", 98, "CaCO3 > 98%"), ("humedad", "<", 0.2, "Humedad < 0.2%"),
                   ("tamano_particula", "<", 5, "Tamaño de partícula < 5 µm")]},
    {"nombre": "Industria del caucho", "aplicacion": "Material de relleno",
     "norma": "ASTM D1193, ISO 3262",
     "criterios": [("caco3", ">", 97, "CaCO3 > 97%")],
     "nota": "Validar granulometría ultrafina."},
    {"nombre": "Tratamiento de aguas", "aplicacion": "Neutralización y control del pH",
     "norma": "AWWA B202, ASTM C25",
     "criterios": [("caco3", ">", 90, "CaCO3 > 90%")],
     "nota": "Requiere elevada reactividad / velocidad de disolución."},
    {"nombre": "Protección ambiental", "aplicacion": "Neutralización de drenajes ácidos y desulfurización",
     "norma": "EPA Method 3052, ASTM C25",
     "criterios": [("caco3", ">", 90, "CaCO3 > 90%"), ("cao_reactivo", ">", 85, "CaO reactivo > 85%")]},
    {"nombre": "Material de construcción", "aplicacion": "Agregados, roca ornamental y afirmados",
     "norma": "ASTM C568, ASTM C97, ASTM C170, NTC 174",
     "criterios": [("resistencia", ">", 50, "Resistencia a compresión > 50 MPa"),
                   ("absorcion", "<", 5, "Absorción < 5%")]},
    {"nombre": "Industria alimentaria", "aplicacion": "Aditivo alimentario (E170)",
     "norma": "Codex Alimentarius, FCC, Reglamento (UE) 231/2012",
     "criterios": [("caco3", ">", 98.5, "CaCO3 > 98.5%"), ("pb", "<", 3, "Pb < 3 ppm"),
                   ("cd", "<", 1, "Cd < 1 ppm"), ("as_ppm", "<", 3, "As < 3 ppm")]},
    {"nombre": "Industria farmacéutica", "aplicacion": "Excipiente y suplementos de calcio",
     "norma": "USP, Ph. Eur., BP",
     "criterios": [("caco3", ">", 99, "CaCO3 > 99%"), ("pb", "<", 3, "Pb < 3 ppm"),
                   ("cd", "<", 1, "Cd < 1 ppm"), ("as_ppm", "<", 3, "As < 3 ppm")]},
]


def evaluar_perfiles(valores):
    """Evalúa los 17 perfiles industriales. valores: dict campo -> float | None (None = sin ensayo).
    Estados: Apto / No Apto / Requiere ensayos."""
    resultados = []
    for p in PERFILES_INDUSTRIALES:
        fallas, pendientes = [], []
        for campo, op, limite, etiqueta in p["criterios"]:
            v = valores.get(campo)
            if v is None:
                pendientes.append(etiqueta)
            elif not (v > limite if op == ">" else v < limite):
                fallas.append(f"{etiqueta} — medido: {v}")
        if fallas:
            estado, razon = "No Apto", "Incumple: " + "; ".join(fallas)
        elif pendientes:
            estado, razon = "Requiere ensayos", "Química conforme. Falta medir: " + "; ".join(pendientes)
        else:
            estado, razon = "Apto", "Cumple todos los criterios químicos."
        if p.get("nota"):
            razon += f" {p['nota']}"
        resultados.append({"nombre": p["nombre"], "aplicacion": p["aplicacion"],
                           "norma": p["norma"], "estado": estado, "razon": razon})
    return resultados


def calcular_evaluacion(caco3, cao, mgo, sio2, fe2o3, al2o3, so3,
                         na2o=0.0, k2o=0.0, p2o5=0.0, pb=0.0, cd=0.0, as_ppm=0.0,
                         petrografia="Micrítica de grano fino",
                         guardar=True, loi=0.0, res_insol=0.0, alcalis=0.0, extras=None):
    """Calcula módulos, fases de Bogue y dictámenes normativos. No hace I/O ni UI."""
    caco3, cao, mgo, sio2, fe2o3, al2o3, so3 = (
        safe_float(caco3), safe_float(cao), safe_float(mgo),
        safe_float(sio2), safe_float(fe2o3), safe_float(al2o3), safe_float(so3)
    )
    na2o, k2o, p2o5, pb, cd, as_ppm = (
        safe_float(na2o), safe_float(k2o), safe_float(p2o5),
        safe_float(pb), safe_float(cd), safe_float(as_ppm)
    )

    if guardar:
        loi = (cao * 0.785) + (mgo * 1.092)
        res_insol = sio2 * 0.85
        alcalis = na2o + (0.658 * k2o)
    else:
        loi, res_insol, alcalis = safe_float(loi), safe_float(res_insol), safe_float(alcalis)

    denom_lsf = (2.8 * sio2) + (1.2 * al2o3) + (0.65 * fe2o3)
    lsf = cao / denom_lsf if denom_lsf > 0 else 0

    denom_sm = al2o3 + fe2o3
    sm = sio2 / denom_sm if denom_sm > 0 else 0

    am = al2o3 / fe2o3 if fe2o3 > 0 else 0

    if 2.0 <= sm <= 3.0:
        interp_sm = "Adecuado"
    elif sm > 3.0:
        interp_sm = "Mezcla difícil de clinkerizar"
    else:
        interp_sm = "Bajo (Fuera de rango óptimo)"

    interp_am = "Óptimo industrial" if 1.3 <= am <= 2.5 else "Fuera de rango óptimo"

    c3s = max(0.0, round((4.071 * cao) - (7.600 * sio2) - (6.718 * al2o3) - (1.430 * fe2o3) - (2.852 * so3), 2))
    c2s = max(0.0, round((2.867 * sio2) - (0.7544 * c3s), 2))
    c3a = max(0.0, round((2.650 * al2o3) - (1.692 * fe2o3), 2))
    c4af = max(0.0, round(3.043 * fe2o3, 2))

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

    # --- Dictámenes industriales (matriz de 17 usos) ---
    extras = extras or {}
    valores = {
        "caco3": caco3, "cao": cao, "mgo": mgo, "sio2": sio2, "fe2o3": fe2o3,
        "p2o5": p2o5, "pb": pb, "cd": cd, "as_ppm": as_ppm,
        # Derivados estequiométricos
        "mgco3": round(mgo * 2.0915, 2),
        "s": round(so3 * 0.4005, 3),
        "caco3_eq": round(caco3 + mgo * 2.478, 2),
    }
    # PN medido si se dio; si no, se aproxima con el CaCO3 equivalente
    valores["pn"] = extras.get("pn") if extras.get("pn") is not None else valores["caco3_eq"]
    for k in ("blancura", "tamano_particula", "humedad", "cao_disponible",
              "cao_reactivo", "resistencia", "absorcion"):
        valores[k] = extras.get(k)

    dictamenes = evaluar_perfiles(valores)

    return {
        "caco3": caco3, "cao": cao, "mgo": mgo, "sio2": sio2, "fe2o3": fe2o3, "al2o3": al2o3, "so3": so3,
        "na2o": na2o, "k2o": k2o, "p2o5": p2o5, "pb": pb, "cd": cd, "as_ppm": as_ppm,
        "loi": loi, "res_insol": res_insol, "alcalis": alcalis,
        "lsf": lsf, "sm": sm, "am": am, "interp_sm": interp_sm, "interp_am": interp_am,
        "c3s": c3s, "c2s": c2s, "c3a": c3a, "c4af": c4af,
        "advertencias_geol": advertencias_geol, "interp_cesar": interp_cesar,
        "errores_norma": errores_norma, "cumple_norma": cumple_norma, "estado_eval": estado_eval,
        "dictamenes": dictamenes,
    }
