import OpenAI from 'openai'

export function aiClient(apiKey: string, baseURL: string, timeout = 90_000): OpenAI {
  return new OpenAI({ apiKey, baseURL, timeout, maxRetries: 0 })
}
