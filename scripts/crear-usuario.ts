// No hay registro público: los usuarios se crean localmente con acceso directo al objeto auth.
// Uso: npx tsx scripts/crear-usuario.ts correo@ejemplo.com claveSegura123 ["Nombre"]
import { auth } from '../server/utils/auth'

async function main() {
  const [email, password, name] = process.argv.slice(2)
  if (!email || !password) {
    console.error('Uso: npx tsx scripts/crear-usuario.ts correo@ejemplo.com claveSegura123 ["Nombre"]')
    process.exit(1)
  }

  const result = await auth.api.signUpEmail({
    body: { email, password, name: name || email.split('@')[0] },
  })

  console.log('Usuario creado:', result.user.email)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error creando usuario:', err.message || err)
  process.exit(1)
})
