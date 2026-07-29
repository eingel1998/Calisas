"""Checks mínimos del módulo de cálculo. Correr con: python3 test_calculos_calizas.py"""
from calculos_calizas import (
    parsear_reporte_xrf, convertir_base_seca, es_base_calcinada,
    validar_extraccion, calcular_evaluacion,
)

# Fragmento real de un reporte Omnian (M10)
TEXTO_XRF = """10-feb-2026 14:24:51 Page 1  Sample results
M10
Sample ident
Application<Omnian>
Compound MgO Al2O3 SiO2 Cl K2O CaO Ti V Cr Mn Fe2O3 Zn As
Conc 0,302 0,333 1,476 0,0 0,131 97,501 95,3 26,5 15,6 175,4 0,198 67,6 0,0
Unit % % % ppm % % ppm ppm ppm ppm % ppm ppm
Compound Zr Sn Sm Pb Eu Yb Lu Re
Conc 42,9 115,9 9,8 23,8 0,0 13,0 4,1 0,0
Unit ppm ppm ppm ppm ppm ppm ppm ppm"""

# --- Parseo ---
d = parsear_reporte_xrf(TEXTO_XRF)
assert d["muestra_id"] == "M10"
assert d["cao"] == 97.501 and d["mgo"] == 0.302 and d["sio2"] == 1.476
assert d["pb"] == 23.8 and d["cd"] == 0.0
assert parsear_reporte_xrf("texto sin tabla alguna") is None

# --- Detección de base calcinada ---
assert es_base_calcinada(d)
assert not es_base_calcinada({"cao": 52.0, "sio2": 3.0})

# --- Conversión a base seca (LOI estimado estequiométricamente) ---
seco = convertir_base_seca(d)
assert abs(seco["loi_estimado"] - 43.45) < 0.1, seco["loi_estimado"]
assert abs(seco["cao"] - 55.13) < 0.05, seco["cao"]
assert abs(seco["caco3"] - 98.4) < 0.1, seco["caco3"]
assert not es_base_calcinada(seco)

# --- Conversión con LOI medido ---
seco2 = convertir_base_seca(d, loi=43.0)
assert abs(seco2["cao"] - 97.501 * 0.57) < 0.01

# --- Validación ---
avisos = validar_extraccion(d)
assert any("base calcinada" in a for a in avisos)
assert not any("base calcinada" in a for a in validar_extraccion(seco))

# --- El dict convertido alimenta la evaluación sin errores ---
campos = ("caco3", "cao", "mgo", "sio2", "fe2o3", "al2o3", "so3", "na2o", "k2o", "pb", "cd", "as_ppm")
r = calcular_evaluacion(**{k: seco[k] for k in campos})
r_calc = calcular_evaluacion(**{k: d[k] for k in campos})
assert r["estado_eval"] in ("APTO", "NO APTO")
# LSF/SM/AM son cocientes: invariantes ante el cambio de base (escala igual arriba y abajo)
assert abs(r["lsf"] - r_calc["lsf"]) < 0.2
# Lo que SÍ corrige la base seca son los umbrales absolutos: CaO cae al rango real de caliza
assert 45 <= seco["cao"] <= 58, seco["cao"]

# --- Motor de 17 perfiles industriales ---
dic = {p["nombre"]: p for p in r["dictamenes"]}
assert len(dic) == 17, len(dic)

# M10 seco: CaCO3 98.4, CaO 55.1, MgO 0.17, SiO2 0.83, Fe2O3 0.11 (todo químico medido)
assert dic["Industria cementera"]["estado"] == "Apto", dic["Industria cementera"]
assert dic["Producción de cal viva"]["estado"] == "Apto", dic["Producción de cal viva"]
assert dic["Industria cerámica"]["estado"] == "Apto"
# Fe2O3 0.11 > 0.05 -> vidrio y química No Apto
assert dic["Industria del vidrio"]["estado"] == "No Apto"
assert dic["Industria química"]["estado"] == "No Apto"
# Pb 13.5 ppm > 3 -> alimentaria/farmacéutica No Apto
assert dic["Industria alimentaria"]["estado"] == "No Apto"
# Sin ensayos físicos -> construcción y papel requieren ensayos
assert dic["Material de construcción"]["estado"] == "Requiere ensayos"
assert dic["Industria del papel"]["estado"] == "Requiere ensayos"
# Cal agrícola: PN estimado por CaCO3 eq (98.8 > 80) -> Apto sin ensayo extra
assert dic["Cal agrícola"]["estado"] == "Apto", dic["Cal agrícola"]

# Con ensayos opcionales medidos, los pendientes se resuelven
r2 = calcular_evaluacion(**{k: seco[k] for k in campos},
                         extras={"resistencia": 80.0, "absorcion": 2.0,
                                 "blancura": 96.0, "tamano_particula": 1.5})
dic2 = {p["nombre"]: p for p in r2["dictamenes"]}
assert dic2["Material de construcción"]["estado"] == "Apto", dic2["Material de construcción"]
assert dic2["Industria del papel"]["estado"] == "Apto", dic2["Industria del papel"]
# Y si el ensayo falla el umbral -> No Apto
r3 = calcular_evaluacion(**{k: seco[k] for k in campos}, extras={"resistencia": 30.0, "absorcion": 2.0})
dic3 = {p["nombre"]: p for p in r3["dictamenes"]}
assert dic3["Material de construcción"]["estado"] == "No Apto"

print("Todos los checks pasaron ✓")
