from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import io
import os
import pandas as pd
from datetime import datetime
import json
import sqlite3

from calculos_calizas import (
    extraer_datos_pdf, es_base_calcinada, convertir_base_seca,
    validar_extraccion, calcular_evaluacion, registrar_muestra_db,
    obtener_muestras_db, borrar_muestra_db, DB_PATH
)

app = FastAPI(title="Evaluación Geoquímica de Calizas API")

# Habilitar CORS para conectar con Nuxt 3 (ej. localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Esquemas Pydantic
class EnsayosOpcionales(BaseModel):
    pn: Optional[float] = None
    blancura: Optional[float] = None
    tamano_particula: Optional[float] = None
    humedad: Optional[float] = None
    cao_disponible: Optional[float] = None
    cao_reactivo: Optional[float] = None
    resistencia: Optional[float] = None
    absorcion: Optional[float] = None

class EvaluacionRequest(BaseModel):
    id_muestra: str
    caco3: Optional[float] = 0.0
    cao: Optional[float] = 0.0
    mgo: Optional[float] = 0.0
    sio2: Optional[float] = 0.0
    fe2o3: Optional[float] = 0.0
    al2o3: Optional[float] = 0.0
    so3: Optional[float] = 0.0
    na2o: Optional[float] = 0.0
    k2o: Optional[float] = 0.0
    p2o5: Optional[float] = 0.0
    pb: Optional[float] = 0.0
    cd: Optional[float] = 0.0
    as_ppm: Optional[float] = 0.0
    drx: Optional[str] = "Calcita"
    petrografia: Optional[str] = "Micrítica de grano fino"
    extras: Optional[EnsayosOpcionales] = None
    archivo_fuente: Optional[str] = "Manual"
    guardar_db: Optional[bool] = True

@app.get("/")
def home():
    return {"status": "ok", "message": "Evaluación Geoquímica de Calizas API en funcionamiento"}

@app.post("/evaluar")
def evaluar_muestra(req: EvaluacionRequest):
    try:
        extras_dict = req.extras.dict() if req.extras else {}
        # Filtrar valores None en extras
        extras_dict = {k: v for k, v in extras_dict.items() if v is not None}

        eval_res = calcular_evaluacion(
            caco3=req.caco3, cao=req.cao, mgo=req.mgo, sio2=req.sio2,
            fe2o3=req.fe2o3, al2o3=req.al2o3, so3=req.so3,
            na2o=req.na2o, k2o=req.k2o, p2o5=req.p2o5,
            pb=req.pb, cd=req.cd, as_ppm=req.as_ppm,
            petrografia=req.petrografia, guardar=True, extras=extras_dict
        )

        full_payload = {
            "id_muestra": req.id_muestra,
            "drx": req.drx,
            "petrografia": req.petrografia,
            "archivo_fuente": req.archivo_fuente,
            "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "extras": extras_dict,
            **eval_res
        }

        if req.guardar_db:
            registrar_muestra_db(full_payload)

        return full_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el cálculo: {str(e)}")

@app.post("/procesar-pdf")
async def procesar_pdf(
    file: UploadFile = File(...),
    convertir: bool = Form(True),
    loi_manual: Optional[float] = Form(None)
):
    try:
        content = await file.read()
        datos_pdf, texto_pdf = extraer_datos_pdf(content)

        if not datos_pdf:
            raise HTTPException(
                status_code=400,
                detail="No se encontró la tabla de óxidos en el PDF (¿es solo el espectro?). Suba el reporte 'Sample results'."
            )

        avisos = []
        is_calcinado = es_base_calcinada(datos_pdf)

        if is_calcinado and convertir:
            datos_pdf = convertir_base_seca(datos_pdf, loi_manual)

        avisos = validar_extraccion(datos_pdf)

        # fallback id a nombre del archivo
        if not datos_pdf.get("muestra_id"):
            datos_pdf["muestra_id"] = file.filename.rsplit(".", 1)[0]

        return {
            "datos": datos_pdf,
            "texto_crudo": texto_pdf,
            "es_base_calcinada": is_calcinado,
            "avisos": avisos
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF: {str(e)}")

@app.get("/historial")
def obtener_historial():
    try:
        return obtener_muestras_db()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leyendo historial: {str(e)}")

@app.delete("/historial/{id_muestra}")
def borrar_muestra(id_muestra: str):
    try:
        borrar_muestra_db(id_muestra)
        return {"status": "ok", "message": f"Muestra {id_muestra} eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando muestra: {str(e)}")

@app.get("/exportar-excel")
def exportar_excel():
    try:
        muestras = obtener_muestras_db()
        if not muestras:
            raise HTTPException(status_code=400, detail="No hay muestras en el historial para exportar")

        # Generar un pandas DataFrame
        # Adaptar los dictámenes en columnas planas
        filas = []
        for m in muestras:
            # Flatten dictámenes
            dict_flat = {}
            for dict_item in m.get("dictamenes", []):
                dict_flat[f"Dictamen {dict_item['nombre']}"] = dict_item["estado"]

            fila = {
                "ID Muestra": m["id_muestra"],
                "CaCO3 (%)": m["caco3"],
                "CaO (%)": m["cao"],
                "MgO (%)": m["mgo"],
                "SiO2 (%)": m["sio2"],
                "Fe2O3 (%)": m["fe2o3"],
                "Al2O3 (%)": m["al2o3"],
                "LSF": round(m["lsf"], 3) if m["lsf"] else None,
                "SO3 (%)": m["so3"],
                "Na2O (%)": m["na2o"],
                "K2O (%)": m["k2o"],
                "P2O5 (%)": m["p2o5"],
                "Pb (ppm)": m["pb"],
                "Cd (ppm)": m["cd"],
                "As (ppm)": m["as_ppm"],
                "DRX": m["drx"],
                "Petrografía": m["petrografia"],
                "LOI (%)": round(m["loi"], 3) if m["loi"] else None,
                "Residuo Insoluble (%)": round(m["res_insol"], 3) if m["res_insol"] else None,
                "Alcalis (Na2Oeq) (%)": round(m["alcalis"], 3) if m["alcalis"] else None,
                "C3S (Alita) (%)": m["c3s"],
                "C2S (Belita) (%)": m["c2s"],
                "C3A (%)": m["c3a"],
                "C4AF (%)": m["c4af"],
                "Modulo de Silice (SM)": round(m["sm"], 3) if m["sm"] else None,
                "Modulo de Alumina (AM)": round(m["am"], 3) if m["am"] else None,
                "Estado Evaluacion": m["estado_eval"],
                "Archivo Fuente": m["archivo_fuente"],
                "Fecha Registro": m["fecha_registro"],
                **dict_flat
            }
            filas.append(fila)

        df = pd.DataFrame(filas)

        # Salvar a bytes buffer
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Calizas Historial')
        output.seek(0)

        headers = {
            'Content-Disposition': 'attachment; filename="BaseDatos_Calizas.xlsx"'
        }
        return StreamingResponse(
            output,
            headers=headers,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exportando Excel: {str(e)}")

@app.post("/procesar-lote")
async def procesar_lote_excel_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))

        def normalize_col(c):
            return str(c).upper().replace(" ", "").replace("(%)", "").replace("DELA", "").replace("DE", "")

        col_map = {c: normalize_col(c) for c in df.columns}
        df_norm = df.rename(columns=col_map)

        muestras_procesadas = []

        for _, row in df_norm.iterrows():
            id_m = row.get("IDMUESTRA")
            if pd.isna(id_m) or str(id_m).strip() == "":
                continue

            id_muestra = str(id_m).strip()

            # Formar request para evaluar
            eval_res = calcular_evaluacion(
                caco3=float(row.get("CACO3", 0.0)) if not pd.isna(row.get("CACO3")) else 0.0,
                cao=float(row.get("CAO", 0.0)) if not pd.isna(row.get("CAO")) else 0.0,
                mgo=float(row.get("MGO", 0.0)) if not pd.isna(row.get("MGO")) else 0.0,
                sio2=float(row.get("SIO2", 0.0)) if not pd.isna(row.get("SIO2")) else 0.0,
                fe2o3=float(row.get("FE2O3", 0.0)) if not pd.isna(row.get("FE2O3")) else 0.0,
                al2o3=float(row.get("AL2O3", 0.0)) if not pd.isna(row.get("AL2O3")) else 0.0,
                so3=float(row.get("SO3", 0.0)) if not pd.isna(row.get("SO3")) else 0.0,
                na2o=float(row.get("NA2O", 0.0)) if not pd.isna(row.get("NA2O")) else 0.0,
                k2o=float(row.get("K2O", 0.0)) if not pd.isna(row.get("K2O")) else 0.0,
                p2o5=float(row.get("P2O5", 0.0)) if not pd.isna(row.get("P2O5")) else 0.0,
                pb=float(row.get("PB", 0.0)) if not pd.isna(row.get("PB")) else 0.0,
                cd=float(row.get("CD", 0.0)) if not pd.isna(row.get("CD")) else 0.0,
                as_ppm=float(row.get("AS", 0.0)) if not pd.isna(row.get("AS")) else 0.0,
                petrografia=str(row.get("PETROGRAFIA", "Micrítica de grano fino")) if not pd.isna(row.get("PETROGRAFIA")) else "Micrítica de grano fino"
            )

            full_payload = {
                "id_muestra": id_muestra,
                "drx": str(row.get("DRX", "Calcita")) if not pd.isna(row.get("DRX")) else "Calcita",
                "petrografia": str(row.get("PETROGRAFIA", "Micrítica de grano fino")) if not pd.isna(row.get("PETROGRAFIA")) else "Micrítica de grano fino",
                "archivo_fuente": filename,
                "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "extras": {},
                **eval_res
            }

            registrar_muestra_db(full_payload)
            muestras_procesadas.append(full_payload)

        return {
            "status": "ok",
            "count": len(muestras_procesadas),
            "muestras": muestras_procesadas
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando lote: {str(e)}")
