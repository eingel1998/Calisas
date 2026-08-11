// SPA sin SSR: la única frontera de seguridad real son los endpoints server/api/.
// Bloquea toda /api/* sin sesión válida, excepto /api/auth/* (login/logout de Better Auth).
import { auth } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || ''
  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/auth/')) return

  const session = await auth.api.getSession({ headers: event.headers })
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' })
  }

  event.context.user = session.user
})
