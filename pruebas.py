import pandas as pd
import os
from calculos_calizas import guardar_en_excel, ARCHIVO_EXCEL as archivo_excel

def inicializar_base_datos():
    """
    Verifica si el archivo Excel existe. Si no existe, crea uno nuevo
    con las columnas predefinidas para el estudio geoquímico.
    """
    if not os.path.exists(archivo_excel):
        # Definimos las columnas exactas que requieren las normativas
        columnas = [
            "ID Muestra", 
            "CaCO3 (%)",
            "CaO (%)",
            "MgO (%)",
            "SiO2 (%)", 
            "Fe2O3 (%)",
            "Al2O3 (%)",
            "LSF",
            "SO3 (%)",
            "LOI (%)",
            "Residuo Insoluble (%)",
            "Alcalis (Na2Oeq) (%)",
            "C3S (Alita) (%)",
            "C2S (Belita) (%)",
            "C3A (%)",
            "C4AF (%)",
            "Modulo de Silice (SM)",
            "Modulo de Alumina (AM)",
            "Estado Evaluacion"
        ]
        
        # Creamos un DataFrame vacío estructurado con esas columnas
        df_vacio = pd.DataFrame(columns=columnas)
        
        # Guardamos el DataFrame vacío como un archivo Excel
        # Nota: index=False evita que se cree una columna extra con números de fila
        df_vacio.to_excel(archivo_excel, index=False)
        print(f"¡Éxito! La base de datos '{archivo_excel}' ha sido creada y está lista para usarse.")
    else:
        print(f" El archivo '{archivo_excel}' ya existe. Sus datos están a salvo y no se sobreescribió nada.")

# Ejecutar la función
inicializar_base_datos()
