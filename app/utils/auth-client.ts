import { createAuthClient } from 'better-auth/vue'

// Sin baseURL a propósito: el cliente lo deriva de window.location.origin y le
// añade /api/auth (ver getBaseURL en better-auth). Pasar una ruta relativa como
// '/api/auth' rompe el bundle entero — el cliente hace new URL(baseURL) y una
// ruta sin protocolo lanza "Invalid base URL" antes de que monte la app.
// Al derivarlo del origen, funciona igual en local, en preview y en producción.
export const authClient = createAuthClient()
