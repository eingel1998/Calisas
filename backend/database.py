"""Módulo para definir el esquema SQLite y manejar la migración de Excel a SQLite."""
import sqlite3
import os
import pandas as pd
import math

DB_PATH = os.path.join(os.path.dirname(__file__), "calizas.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tabla principal para guardar todas las muestras evaluadas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS muestras (
        id_muestra TEXT PRIMARY KEY,
        caco3 REAL,
        cao REAL,
        mgo REAL,
        sio2 REAL,
        fe2o3 REAL,
        al2o3 REAL,
        so3 REAL,
        na2o REAL,
        k2o REAL,
        p2o5 REAL,
        pb REAL,
        cd REAL,
        as_ppm REAL,
        drx TEXT,
        petrografia TEXT,

        -- Propiedades Calculadas
        loi REAL,
        res_insol REAL,
        alcalis REAL,
        lsf REAL,
        sm REAL,
        am REAL,
        c3s REAL,
        c2s REAL,
        c3a REAL,
        c4af REAL,
        estado_eval TEXT,

        -- Metadatos
        archivo_fuente TEXT,
        fecha_registro TEXT,

        -- Dictámenes dinámicos almacenados como JSON (para soportar los 17 perfiles de forma flexible)
        dictamenes_json TEXT,

        -- Ensayos opcionales
        pn REAL,
        blancura REAL,
        tamano_particula REAL,
        humedad REAL,
        cao_disponible REAL,
        cao_reactivo REAL,
        resistencia REAL,
        absorcion REAL
    )
    """)
    conn.commit()
    conn.close()

def migrar_desde_excel(excel_path):
    if not os.path.exists(excel_path):
        print(f"No se encontró el archivo Excel en {excel_path}, omitiendo migración.")
        return

    init_db()

    df = pd.read_excel(excel_path)
    if df.empty:
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Importar cada muestra
    for _, r in df.iterrows():
        id_m = r.get("ID Muestra")
        if pd.isna(id_m) or str(id_m).strip() == "":
            continue

        id_muestra = str(id_m).strip()

        # Helper to get clean value
        def get_val(col, default=0.0):
            val = r.get(col)
            if pd.isna(val):
                return default
            return float(val)

        def get_str(col, default=""):
            val = r.get(col)
            if pd.isna(val):
                return default
            return str(val).strip()

        # Extraer dictámenes si existen en columnas con prefijo 'Dictamen ' o directo
        # Para mantener compatibilidad con las columnas del Excel antiguo y los 17 perfiles nuevos,
        # guardaremos un JSON simplificado de dictámenes.
        dictamenes_dict = []
        for col in df.columns:
            if col.startswith("Dictamen "):
                nombre_perfil = col.replace("Dictamen ", "")
                dictamenes_dict.append({
                    "nombre": nombre_perfil,
                    "estado": get_str(col, "No Apto"),
                    "aplicacion": "",
                    "norma": "",
                    "razon": "Migrado de histórico Excel"
                })

        import json
        dictamenes_json = json.dumps(dictamenes_dict)

        # Mapeo de columnas con fallback de nombres
        # Se guarda el registro en la base de datos
        try:
            cursor.execute("""
            INSERT OR REPLACE INTO muestras (
                id_muestra, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, p2o5, pb, cd, as_ppm,
                drx, petrografia, loi, res_insol, alcalis, lsf, sm, am, c3s, c2s, c3a, c4af,
                estado_eval, archivo_fuente, fecha_registro, dictamenes_json,
                pn, blancura, tamano_particula, humedad, cao_disponible, cao_reactivo, resistencia, absorcion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                id_muestra,
                get_val("CaCO3 (%)"),
                get_val("CaO (%)"),
                get_val("MgO (%)"),
                get_val("SiO2 (%)"),
                get_val("Fe2O3 (%)"),
                get_val("Al2O3 (%)"),
                get_val("SO3 (%)"),
                get_val("Na2O (%)", None),
                get_val("K2O (%)", None),
                get_val("P2O5 (%)", None),
                get_val("Pb (ppm)", None),
                get_val("Cd (ppm)", None),
                get_val("As (ppm)", None),
                get_str("DRX", None),
                get_str("Petrografía", None),
                get_val("LOI (%)"),
                get_val("Residuo Insoluble (%)"),
                get_val("Alcalis (Na2Oeq) (%)"),
                get_val("LSF"),
                get_val("Modulo de Silice (SM)"),
                get_val("Modulo de Alumina (AM)"),
                get_val("C3S (Alita) (%)"),
                get_val("C2S (Belita) (%)"),
                get_val("C3A (%)"),
                get_val("C4AF (%)"),
                get_str("Estado Evaluacion", "APTO"),
                get_str("Archivo Fuente", "Excel histórico"),
                get_str("Fecha Registro", pd.Timestamp.now().strftime("%Y-%m-%d %H:%M")),
                dictamenes_json,
                get_val("PN (%)", None),
                get_val("Blancura (%)", None),
                get_val("Tamaño Partícula (µm)", None),
                get_val("Humedad (%)", None),
                get_val("CaO Disponible (%)", None),
                get_val("CaO Reactivo (%)", None),
                get_val("Resistencia (MPa)", None),
                get_val("Absorción (%)", None)
            ))
        except Exception as e:
            print(f"Error migrando fila {id_muestra}: {e}")

    conn.commit()
    conn.close()
    print("¡Migración completada exitosamente!")

if __name__ == "__main__":
    init_db()
    excel_file = os.path.join(os.path.dirname(__file__), "BaseDatos_Calizas.xlsx")
    migrar_desde_excel(excel_file)
