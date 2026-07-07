import customtkinter as ctk
from tkinter import messagebox
import pandas as pd
import os
import threading
from calculos_calizas import guardar_en_excel, calcular_evaluacion

# Configuración base
ctk.set_appearance_mode("Light")
ctk.set_default_color_theme("blue")

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Software Calizas - Cemento Portland")
        self.geometry("820x960")
        self.resizable(True, True)
        self.minsize(800, 850)
        
        # Fondo general adaptativo
        self.configure(fg_color=("#ffffff", "#0f172a"))
        
        self.dynamic_labels = []

        self.main_container = ctk.CTkFrame(self, fg_color="transparent")
        self.main_container.pack(fill="both", expand=True, padx=35, pady=20)

        # --- ENCABEZADO Y MODO OSCURO ---
        self.header_frame = ctk.CTkFrame(self.main_container, fg_color="transparent")
        self.header_frame.pack(fill="x", pady=(0, 15))
        
        self.title_frame = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        self.title_frame.pack(side="left", fill="x", expand=True)

        self.lbl_title = ctk.CTkLabel(
            self.title_frame, text="Evaluación Geoquímica", 
            font=ctk.CTkFont(family="Segoe UI", size=24, weight="bold"), text_color=("#0f172a", "#f8fafc")
        )
        self.lbl_title.pack(anchor="w")

        self.lbl_subtitle = ctk.CTkLabel(
            self.title_frame, text="Módulo Cemento Portland (Normas ASTM C150 y NTC 321)", 
            font=ctk.CTkFont(family="Segoe UI", size=13), text_color=("#64748b", "#cbd5e1")
        )
        self.lbl_subtitle.pack(anchor="w", pady=(0, 8))

        # Minimalista: Línea azul muy delgada
        self.line_frame = ctk.CTkFrame(self.title_frame, fg_color="#3b82f6", height=2, width=40, corner_radius=0)
        self.line_frame.pack(anchor="w")

        # Toggle de Tema
        self.switch_var = ctk.StringVar(value="off")
        self.switch_theme = ctk.CTkSwitch(
            self.header_frame, text="Modo Oscuro", command=self.toggle_dark_mode, 
            variable=self.switch_var, onvalue="on", offvalue="off",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=("#475569", "#94a3b8")
        )
        self.switch_theme.pack(side="right", anchor="e")

        # --- SISTEMA DE PESTAÑAS (TABS) ---
        self.tabview = ctk.CTkTabview(self.main_container, border_width=0, fg_color="transparent")
        self.tabview.pack(fill="x", pady=5)
        
        self.tab_nueva = self.tabview.add("Evaluar Nueva Muestra")
        self.tab_historial = self.tabview.add("Consultar Historial")
        
        self.setup_tab_nueva()
        self.setup_tab_historial()

        # Minimalista: Sin bordes gruesos
        self.results_frame = ctk.CTkScrollableFrame(
            self.main_container, fg_color="transparent", corner_radius=0, 
            border_width=0
        )
        self.results_frame.pack(fill="both", expand=True, pady=(15, 0), ipadx=5, ipady=5)

        self.mostrar_mensaje_espera()

        self.results_frame.bind("<Configure>", self.on_frame_resize, add="+")

    def toggle_dark_mode(self):
        if self.switch_var.get() == "on":
            ctk.set_appearance_mode("Dark")
        else:
            ctk.set_appearance_mode("Light")

    def mostrar_mensaje_espera(self):
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        lbl_espera = ctk.CTkLabel(
            self.results_frame, text="Esperando datos...", 
            font=ctk.CTkFont(family="Segoe UI", size=14), text_color=("#94a3b8", "#64748b")
        )
        lbl_espera.pack(anchor="center", pady=(40, 0))

    def setup_tab_nueva(self):
        self.card_frame = ctk.CTkFrame(self.tab_nueva, fg_color="transparent")
        self.card_frame.pack(fill="x", pady=5)

        self.card_frame.grid_columnconfigure(0, weight=1)
        self.card_frame.grid_columnconfigure(1, weight=1)
        self.card_frame.grid_columnconfigure(2, weight=0)  
        self.card_frame.grid_columnconfigure(3, weight=1)
        self.card_frame.grid_columnconfigure(4, weight=1)

        self.entries = {}
        campos_izq = [
            ("ID Muestra", "Ej: CAR-001", False),
            ("CaCO3 (%)", "Rango: >75 - 80%", True),
            ("CaO (%)", "Rango: 45 - 52%", True),
            ("MgO (%)", "Límite: <= 5.0%", True),
            ("SiO2 (%)", "Rango: 5 - 15%", True),
            ("Fe2O3 (%)", "Rango: 1 - 5%", True)
        ]
        campos_der = [
            ("Al2O3 (%)", "Rango: 1 - 6%", True),
            ("SO3 (%)", "Rango: 3.0 - 3.5%", True),
            ("Na2O (%)", "Óxido de sodio", True),
            ("K2O (%)", "Óxido de potasio", True)
        ]

        def crear_campos(lista, col_base):
            for i, (campo, placeholder, is_percent) in enumerate(lista):
                lbl_frame = ctk.CTkFrame(self.card_frame, fg_color="transparent")
                lbl_frame.grid(row=i, column=col_base, padx=(5, 5), pady=8, sticky="w")
                
                # Minimalista: Sin cuadro de icono, solo texto
                lbl = ctk.CTkLabel(lbl_frame, text=campo, font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#475569", "#cbd5e1"))
                lbl.pack(side="left")
                
                entry_frame = ctk.CTkFrame(self.card_frame, fg_color="transparent")
                entry_frame.grid(row=i, column=col_base+1, padx=(5, 10), pady=8, sticky="w")
                
                entry = ctk.CTkEntry(
                    entry_frame, placeholder_text=placeholder, width=120, height=30,
                    corner_radius=4, border_width=1, border_color=("#e2e8f0", "#334155"),
                    fg_color="transparent", font=ctk.CTkFont(family="Segoe UI", size=12)
                )
                entry.pack(side="left")
                
                if is_percent:
                    pct_lbl = ctk.CTkLabel(entry_frame, text="%", font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#cbd5e1", "#64748b"))
                    pct_lbl.pack(side="left", padx=(5, 0))
                
                self.entries[campo] = entry

        crear_campos(campos_izq, 0)
        
        col_sep = ctk.CTkFrame(self.card_frame, fg_color="transparent", width=20, height=1)
        col_sep.grid(row=0, column=2, rowspan=6)
        
        crear_campos(campos_der, 3)

        self.btn_guardar = ctk.CTkButton(
            self.tab_nueva, text="Calcular LSF y Evaluar Muestra", command=self.procesar_datos_formulario, 
            height=40, corner_radius=6, fg_color="#3b82f6", hover_color="#2563eb",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold")
        )
        self.btn_guardar.pack(pady=(15, 5), fill="x")

    def setup_tab_historial(self):
        lbl = ctk.CTkLabel(self.tab_historial, text="Seleccione una muestra guardada:", font=ctk.CTkFont(family="Segoe UI", size=13))
        lbl.pack(pady=(15, 5))

        self.cmb_muestras = ctk.CTkComboBox(self.tab_historial, values=["Cargando..."], width=200, corner_radius=4)
        self.cmb_muestras.pack(pady=5)
        
        btn_cargar = ctk.CTkButton(self.tab_historial, text="Cargar Observaciones", command=self.cargar_historial, height=35, corner_radius=6)
        btn_cargar.pack(pady=10)
        
        btn_actualizar_lista = ctk.CTkButton(self.tab_historial, text="Actualizar Lista", command=self.actualizar_lista_muestras, fg_color="transparent", border_width=1, border_color=("#cbd5e1", "#475569"), text_color=("#475569", "#cbd5e1"), corner_radius=6)
        btn_actualizar_lista.pack(pady=5)
        
        self.actualizar_lista_muestras()

    def actualizar_lista_muestras(self):
        self.cmb_muestras.set("Cargando...")
        # Optimización: Cargar Excel en segundo plano para no congelar la app al abrir
        threading.Thread(target=self._cargar_datos_bg, daemon=True).start()

    def _cargar_datos_bg(self):
        archivo = "BaseDatos_Calizas.xlsx"
        if os.path.exists(archivo):
            try:
                df = pd.read_excel(archivo)
                if "ID Muestra" in df.columns and not df.empty:
                    ids = df["ID Muestra"].dropna().astype(str).unique().tolist()
                    if ids:
                        self.after(0, lambda: self._actualizar_cmb(ids))
                    else:
                        self.after(0, lambda: self.cmb_muestras.set("(Sin datos)"))
                else:
                    self.after(0, lambda: self.cmb_muestras.set("(Sin datos)"))
            except Exception as e:
                self.after(0, lambda: self.cmb_muestras.set("Error"))
        else:
            self.after(0, lambda: self.cmb_muestras.set("(Sin datos)"))

    def _actualizar_cmb(self, ids):
        self.cmb_muestras.configure(values=ids)
        self.cmb_muestras.set(ids[-1])

    def procesar_datos_formulario(self):
        try:
            muestra = self.entries["ID Muestra"].get()
            if not muestra:
                messagebox.showwarning("Advertencia", "El ID de muestra es obligatorio.")
                return

            def safe_float(entry):
                val = entry.get()
                return float(val) if val else 0.0

            caco3 = safe_float(self.entries["CaCO3 (%)"])
            cao = safe_float(self.entries["CaO (%)"])
            mgo = safe_float(self.entries["MgO (%)"])
            sio2 = safe_float(self.entries["SiO2 (%)"])
            fe2o3 = safe_float(self.entries["Fe2O3 (%)"])
            al2o3 = safe_float(self.entries["Al2O3 (%)"])
            so3 = safe_float(self.entries["SO3 (%)"])
            na2o = safe_float(self.entries["Na2O (%)"])
            k2o = safe_float(self.entries["K2O (%)"])
            
            self.generar_reporte(muestra, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o, guardar=True)
            
            for entry in self.entries.values():
                entry.delete(0, 'end')
                
            self.actualizar_lista_muestras()

        except ValueError:
            messagebox.showerror("Error", "Por favor, ingrese valores numéricos válidos en todos los campos.")

    def cargar_historial(self):
        seleccion = self.cmb_muestras.get()
        if seleccion in ["(Sin datos)", "Cargando...", "Error", ""] or not seleccion:
            messagebox.showwarning("Advertencia", "No hay muestra válida seleccionada.")
            return
            
        archivo = "BaseDatos_Calizas.xlsx"
        if os.path.exists(archivo):
            try:
                df = pd.read_excel(archivo)
                if "ID Muestra" in df.columns:
                    df_filtrado = df[df["ID Muestra"].astype(str) == seleccion]
                    if not df_filtrado.empty:
                        row = df_filtrado.iloc[-1]
                        def sf(col):
                            v = row.get(col, 0.0)
                            if pd.isna(v): return 0.0
                            return float(v)
                            
                        self.generar_reporte(
                            seleccion, sf("CaCO3 (%)"), sf("CaO (%)"), sf("MgO (%)"), sf("SiO2 (%)"),
                            sf("Fe2O3 (%)"), sf("Al2O3 (%)"), sf("SO3 (%)"), sf("Na2O (%)"), sf("K2O (%)"), 
                            guardar=False, loi=sf("LOI (%)"), res_insol=sf("Residuo Insoluble (%)"), alcalis=sf("Alcalis (Na2Oeq) (%)")
                        )
                    else:
                        messagebox.showwarning("Advertencia", "Muestra no encontrada.")
            except Exception as e:
                messagebox.showerror("Error", f"Error al leer base de datos: {e}")

    def crear_seccion_titulo(self, master, titulo):
        lbl = ctk.CTkLabel(master, text=titulo, font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"), text_color=("#3b82f6", "#60a5fa"))
        lbl.pack(anchor="w", pady=(15, 5))

    def crear_metrica(self, master, titulo, valor, descripcion="", color_valor=None):
        # Minimalista: Sin fondo fuerte, solo línea separadora
        frame = ctk.CTkFrame(master, fg_color="transparent", border_width=1, border_color=("#e2e8f0", "#1e293b"), corner_radius=6)
        frame.pack(side="left", fill="both", expand=True, padx=5, pady=5, ipadx=8, ipady=8)
        
        lbl_tit = ctk.CTkLabel(frame, text=titulo, font=ctk.CTkFont(family="Segoe UI", size=11), text_color=("#64748b", "#94a3b8"))
        lbl_tit.pack(anchor="w")
        
        t_color = color_valor if color_valor else ("#0f172a", "#f8fafc")
        lbl_val = ctk.CTkLabel(frame, text=valor, font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"), text_color=t_color)
        lbl_val.pack(anchor="w")
        
        if descripcion:
            lbl_desc = ctk.CTkLabel(frame, text=descripcion, font=ctk.CTkFont(family="Segoe UI", size=11), text_color=("#94a3b8", "#64748b"))
            lbl_desc.pack(anchor="w")

    def generar_reporte(self, muestra, caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o=0.0, k2o=0.0, guardar=True, loi=0.0, res_insol=0.0, alcalis=0.0):
        r = calcular_evaluacion(caco3, cao, mgo, sio2, fe2o3, al2o3, so3, na2o, k2o,
                                 guardar=guardar, loi=loi, res_insol=res_insol, alcalis=alcalis)
        caco3, cao, mgo, sio2, fe2o3, al2o3, so3 = r["caco3"], r["cao"], r["mgo"], r["sio2"], r["fe2o3"], r["al2o3"], r["so3"]
        na2o, k2o = r["na2o"], r["k2o"]
        loi, res_insol, alcalis = r["loi"], r["res_insol"], r["alcalis"]
        lsf, sm, am = r["lsf"], r["sm"], r["am"]
        c3s, c2s, c3a, c4af = r["c3s"], r["c2s"], r["c3a"], r["c4af"]
        advertencias_geol, interp_cesar = r["advertencias_geol"], r["interp_cesar"]
        errores_norma, cumple_norma, estado_eval = r["errores_norma"], r["cumple_norma"], r["estado_eval"]

        color_ok = ("#059669", "#34d399")
        color_warn = ("#d97706", "#fbbf24")
        color_bad = ("#dc2626", "#f87171")

        if r["interp_sm"] == "Adecuado":
            interp_sm, color_sm = "Adecuado", color_ok
        elif r["interp_sm"] == "Mezcla difícil de clinkerizar":
            interp_sm, color_sm = "Difícil", color_bad
        else:
            interp_sm, color_sm = "Fuera de rango", color_warn

        if r["interp_am"] == "Óptimo industrial":
            interp_am, color_am = "Óptimo", color_ok
        else:
            interp_am, color_am = "Fuera de rango", color_warn

        if guardar:
            datos = {
                "ID Muestra": muestra, "CaCO3 (%)": caco3, "CaO (%)": cao, "MgO (%)": mgo,
                "SiO2 (%)": sio2, "Fe2O3 (%)": fe2o3, "Al2O3 (%)": al2o3, "LSF": round(lsf, 3),
                "SO3 (%)": so3, "Na2O (%)": na2o, "K2O (%)": k2o, "LOI (%)": round(loi, 3), "Residuo Insoluble (%)": round(res_insol, 3),
                "Alcalis (Na2Oeq) (%)": round(alcalis, 3), "C3S (Alita) (%)": c3s, "C2S (Belita) (%)": c2s,
                "C3A (%)": c3a, "C4AF (%)": c4af, "Modulo de Silice (SM)": round(sm, 3),
                "Modulo de Alumina (AM)": round(am, 3), "Estado Evaluacion": estado_eval
            }
            try:
                guardar_en_excel(datos)
                # Toast silencioso o omitir para ser minimalista, pero dejemos info.
            except PermissionError:
                messagebox.showerror("Error", "El archivo Excel está abierto.")
                return

        # VACIAR PANEL DE RESULTADOS
        self.dynamic_labels.clear()
        for widget in self.results_frame.winfo_children():
            widget.destroy()

        # TITULO PRINCIPAL
        header_res = ctk.CTkFrame(self.results_frame, fg_color="transparent")
        header_res.pack(fill="x", pady=(0, 10))
        
        if cumple_norma:
            lbl_tit = ctk.CTkLabel(header_res, text=f"{muestra}: APTO", 
                                  font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"), text_color=("#059669", "#34d399"))
            lbl_desc = ctk.CTkLabel(header_res, text="Cumple satisfactoriamente con la norma ASTM C150 / NTC 321.",
                                   font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#64748b", "#94a3b8"))
        else:
            lbl_tit = ctk.CTkLabel(header_res, text=f"{muestra}: NO APTO", 
                                  font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold"), text_color=("#dc2626", "#f87171"))
            lbl_desc = ctk.CTkLabel(header_res, text="Supera límites químicos de la norma.",
                                   font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#64748b", "#94a3b8"))

        lbl_tit.pack(anchor="w")
        lbl_desc.pack(anchor="w")

        # PARÁMETROS CALCULADOS
        self.crear_seccion_titulo(self.results_frame, "Parámetros Calculados")
        calc_frame = ctk.CTkFrame(self.results_frame, fg_color="transparent")
        calc_frame.pack(fill="x")
        self.crear_metrica(calc_frame, "LOI Calculado", f"{round(loi, 3)}%")
        self.crear_metrica(calc_frame, "Residuo Insoluble Calc.", f"{round(res_insol, 3)}%")
        self.crear_metrica(calc_frame, "Álcalis Equivalentes", f"{round(alcalis, 3)}%")

        # MODULOS
        self.crear_seccion_titulo(self.results_frame, "Módulos de Control Químico")
        mod_frame = ctk.CTkFrame(self.results_frame, fg_color="transparent")
        mod_frame.pack(fill="x")
        self.crear_metrica(mod_frame, "Saturación LSF", f"{round(lsf, 3)}")
        self.crear_metrica(mod_frame, "Módulo Sílice", f"{round(sm, 3)}", interp_sm, color_sm)
        self.crear_metrica(mod_frame, "Módulo Alúmina", f"{round(am, 3)}", interp_am, color_am)

        # BOGUE
        self.crear_seccion_titulo(self.results_frame, "Mineralogía (Bogue)")
        bogue_frame = ctk.CTkFrame(self.results_frame, fg_color="transparent")
        bogue_frame.pack(fill="x")
        self.crear_metrica(bogue_frame, "Alita (C3S)", f"{c3s}%")
        self.crear_metrica(bogue_frame, "Belita (C2S)", f"{c2s}%")
        self.crear_metrica(bogue_frame, "C3A", f"{c3a}%")
        self.crear_metrica(bogue_frame, "C4AF", f"{c4af}%")

        # INTERPRETACION CESAR Y NORMAS (MINIMALISTA)
        bottom_frame = ctk.CTkFrame(self.results_frame, fg_color="transparent")
        bottom_frame.pack(fill="x", pady=(15, 0))
        
        col1 = ctk.CTkFrame(bottom_frame, fg_color="transparent")
        col1.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        col2 = ctk.CTkFrame(bottom_frame, fg_color="transparent")
        col2.pack(side="left", fill="both", expand=True, padx=(5, 0))

        self.crear_seccion_titulo(col1, "Geología")
        for interp in interp_cesar:
            lbl = ctk.CTkLabel(col1, text=f"{interp}", font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#475569", "#cbd5e1"))
            lbl.pack(anchor="w", pady=1)
            self.dynamic_labels.append(lbl)
            
        if advertencias_geol:
            for adv in advertencias_geol:
                lbl = ctk.CTkLabel(col1, text=f"• {adv}", font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#64748b", "#94a3b8"))
                lbl.pack(anchor="w", pady=1)
                self.dynamic_labels.append(lbl)

        if not cumple_norma:
            self.crear_seccion_titulo(col2, "Desviaciones")
            for err in errores_norma:
                lbl = ctk.CTkLabel(col2, text=f"{err}", font=ctk.CTkFont(family="Segoe UI", size=12), text_color=("#dc2626", "#fca5a5"))
                lbl.pack(anchor="w", pady=1)
                self.dynamic_labels.append(lbl)

        self.results_frame.update_idletasks()
        self.on_frame_resize(None)

    def on_frame_resize(self, event):
        width = self.results_frame.winfo_width()
        new_width = (width / 2) - 40 if len(self.dynamic_labels) > 0 else width - 40
        if new_width > 100:
            for lbl in self.dynamic_labels:
                lbl.configure(wraplength=new_width)

if __name__ == "__main__":
    app = App()
    app.mainloop()
