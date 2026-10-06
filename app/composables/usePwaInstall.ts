import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const pendingPrompt = shallowRef<InstallPrompt | null>(null)
  const installed = ref(false)
  const ios = ref(false)
  const mobile = ref(false)
  const dismissedUntil = ref(0)
  const installing = ref(false)
  const error = ref('')
  const instructionsOpen = ref(false)
  const available = computed(() => !installed.value && (ios.value || !!pendingPrompt.value))
  const showBanner = computed(() => available.value && Date.now() >= dismissedUntil.value)
  const storageKey = 'calcita-install-dismissed-until'
  let displayMode: MediaQueryList

  function dismiss() {
    dismissedUntil.value = Date.now() + 7 * 24 * 60 * 60 * 1000
    try { localStorage.setItem(storageKey, String(dismissedUntil.value)) } catch { /* el aviso también se oculta sin almacenamiento */ }
  }

  function capturePrompt(event: Event) {
    event.preventDefault()
    pendingPrompt.value = event as InstallPrompt
  }

  function markInstalled() {
    installed.value = true
    pendingPrompt.value = null
    instructionsOpen.value = false
  }

  function updateDisplayMode() {
    installed.value = displayMode.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone
    if (installed.value) markInstalled()
  }

  async function install() {
    if (!available.value || installing.value) return
    error.value = ''
    const prompt = pendingPrompt.value
    if (!prompt) { instructionsOpen.value = true; return }
    installing.value = true
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') markInstalled()
      else dismiss()
    } catch {
      error.value = 'No se pudo abrir la instalación. Recarga la página y vuelve a intentarlo.'
      dismiss()
    } finally {
      pendingPrompt.value = null
      installing.value = false
    }
  }

  onMounted(() => {
    ios.value = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    mobile.value = ios.value || /Android/.test(navigator.userAgent)
    displayMode = window.matchMedia('(display-mode: standalone)')
    updateDisplayMode()
    try { dismissedUntil.value = Number(localStorage.getItem(storageKey)) || 0 } catch { /* almacenamiento opcional */ }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    displayMode.addEventListener('change', updateDisplayMode)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', capturePrompt)
    window.removeEventListener('appinstalled', markInstalled)
    displayMode?.removeEventListener('change', updateDisplayMode)
  })

  return { available, showBanner, mobile, installing, instructionsOpen, error, dismiss, install }
}
