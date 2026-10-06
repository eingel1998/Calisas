# Seguimiento del ajuste autorizado

Se corrigió el hallazgo 6: la barra móvil conserva Inicio, Cargar, Historial y Ajustes. Instalar app está en el menú secundario del encabezado, con controles de al menos 44 px y cierre nativo del popover.

Verificación en 390 × 844 con API simulada y agente de usuario iPhone: el menú muestra Instalar app y Cerrar sesión; seleccionar instalar abre la guía, permanece abierta y Escape la cierra. Evidencia: `install-menu-mobile-2026-10-06.jpg`.

65 pruebas pasan, compilación Nuxt completada y diff sin errores de espacios. La instalación real del sistema operativo no fue ejecutada. Los otros hallazgos del informe quedan pendientes de selección; no hubo publicación ni cambios en datos reales.
