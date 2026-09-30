import { resolve } from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  app: { head: { title: 'Calcita', link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },
  modules: [
    '@nuxt/ui'
  ],
  components: [{ path: '~/components', pathPrefix: false }],
  css: [
    '~/assets/css/main.css'
  ],
  ssr: false, // SPA mode for dashboard, extremely fast and avoids SSR issues
  colorMode: {
    preference: 'light' // Force light mode for clean and clear minerals aesthetic
  },
  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  },
  future: {
    compatibilityVersion: 4,
  },
  nitro: {
    // los informes IA con búsqueda web tardan 1–4 min
    vercel: { functions: { maxDuration: 300 } },
    externals: {
      traceInclude: [resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')]
    }
  }
})
