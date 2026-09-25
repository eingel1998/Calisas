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
