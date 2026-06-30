import pandas as pd
import os

# Nombre del archivo de tu base de datos
archivo_excel = "BaseDatos_Calizas.xlsx"

def inicializar_base_datos():
    """
    Verifica si el archivo Excel existe. Si no existe, crea uno nuevo
    con las columnas predefinidas para el estudio geoquímico.
    """
    if True: # Forzar recreación con nuevas columnas
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

def guardar_en_excel(datos, archivo=archivo_excel):
    """
    Recibe un diccionario con los datos de la caliza y los anexa al Excel.
    Si el archivo no existe, lo crea automáticamente.
    """
    df_nuevo = pd.DataFrame([datos])
    
    if os.path.exists(archivo):
        # Leer el Excel existente y concatenar los nuevos datos
        df_existente = pd.read_excel(archivo)
        df_final = pd.concat([df_existente, df_nuevo], ignore_index=True)
    else:
        # Primer registro, crear la base
        df_final = df_nuevo
        
    # Guardar sin el índice numérico de pandas
    df_final.to_excel(archivo, index=False)
    print(f"Los datos han sido guardados en '{archivo}' de manera exitosa.")
