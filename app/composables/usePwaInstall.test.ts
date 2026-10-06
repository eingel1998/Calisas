import { afterEach, expect, it, vi } from 'vitest'
import { usePwaInstall } from './usePwaInstall'

const lifecycle = vi.hoisted(() => ({ mount: () => {}, unmount: () => {} }))
vi.mock('vue', async (original) => ({
  ...await original<typeof import('vue')>(),
  onMounted: (callback: () => void) => { lifecycle.mount = callback },
  onUnmounted: (callback: () => void) => { lifecycle.unmount = callback }
}))

function browser(ios = false, standalone = false, storage = new Map<string, string>()) {
  const window = new EventTarget()
  const media = Object.assign(new EventTarget(), { matches: standalone })
  Object.assign(window, { matchMedia: () => media })
  vi.stubGlobal('window', window)
  vi.stubGlobal('navigator', { userAgent: ios ? 'iPhone' : 'Chrome', platform: ios ? 'iPhone' : 'Linux', maxTouchPoints: 0, standalone })
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  const state = usePwaInstall()
  lifecycle.mount()
  return { state, window, media, storage }
}

afterEach(() => { lifecycle.unmount(); vi.unstubAllGlobals() })

it('instala, recuerda el aplazamiento, guía en iOS y oculta el aviso al instalarse', async () => {
  const { state, window, storage } = browser()
  expect(state.available.value).toBe(false)
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt, userChoice: Promise.resolve({ outcome: 'dismissed' })
  })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  expect(state.showBanner.value).toBe(true)
  state.dismiss()
  expect(state.showBanner.value).toBe(false)
  expect(state.available.value).toBe(true)
  await state.install()
  expect(prompt).toHaveBeenCalledOnce()
  expect(state.available.value).toBe(false)
  window.dispatchEvent(new Event('beforeinstallprompt'))
  expect(state.showBanner.value).toBe(false)
  lifecycle.unmount()

  const reloaded = browser(true, false, storage)
  expect(reloaded.state.showBanner.value).toBe(false)
  expect(reloaded.state.available.value).toBe(true)
  lifecycle.unmount()

  const iphone = browser(true)
  expect(iphone.state.showBanner.value).toBe(true)
  await iphone.state.install()
  expect(iphone.state.instructionsOpen.value).toBe(true)
  iphone.window.dispatchEvent(new Event('appinstalled'))
  expect(iphone.state.available.value).toBe(false)
  expect(iphone.state.instructionsOpen.value).toBe(false)
  lifecycle.unmount()

  const installed = browser(true, true)
  expect(installed.state.showBanner.value).toBe(false)
  expect(installed.state.available.value).toBe(false)
  lifecycle.unmount()

  const failed = browser()
  failed.window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn().mockRejectedValue(new Error('blocked'))
  }))
  await failed.state.install()
  expect(failed.state.error.value).toContain('No se pudo abrir')
  expect(failed.state.installing.value).toBe(false)
  lifecycle.unmount()

  const accepted = browser()
  accepted.window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome: 'accepted' })
  }))
  await accepted.state.install()
  expect(accepted.state.available.value).toBe(false)
  expect(accepted.state.showBanner.value).toBe(false)
})
