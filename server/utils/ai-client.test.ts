import { afterEach, expect, it, vi } from 'vitest'
import { aiClient } from './ai-client'

afterEach(() => vi.unstubAllGlobals())

it('envía chat e imágenes al proveedor configurado', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({
    id: 'test', object: 'chat.completion', created: 0, model: 'vision',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'Informe' } }],
  }), { headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetch)

  const response = await aiClient('test-key', 'https://proveedor.example/v1').chat.completions.create({
    model: 'vision',
    messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } }] }],
  })

  expect(fetch).toHaveBeenCalledOnce()
  expect(String(fetch.mock.calls[0][0])).toBe('https://proveedor.example/v1/chat/completions')
  expect(response.choices[0].message.content).toBe('Informe')
})

it('el enrutamiento de proveedor es opcional y solo aplica a OpenRouter', async () => {
  const { enrutamiento_proveedor: r } = await import('./ai-client')
  expect(r('https://openrouter.ai/api/v1', '')).toEqual({})
  expect(r('https://otro.example/v1', 'google-ai-studio/flex')).toEqual({})
  expect(r('https://openrouter.ai/api/v1', 'google-ai-studio/flex')).toEqual({ provider: { order: ['google-ai-studio/flex'], allow_fallbacks: true } })
  expect(r('https://openrouter.ai/api/v1', 'a, b')).toEqual({ provider: { order: ['a', 'b'], allow_fallbacks: true } })
})
