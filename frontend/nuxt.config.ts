// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: [
    '@nuxt/ui'
  ],
  css: [
    '~/assets/css/main.css'
  ],
  ssr: false, // SPA mode for dashboard, extremely fast and avoids SSR issues
  colorMode: {
    preference: 'light' // Force light mode for clean and clear minerals aesthetic
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000'
    }
  },
  future: {
    compatibilityVersion: 4,
  }
})
