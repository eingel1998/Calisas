import { resolve } from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Calcita',
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#059669' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }, { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }]
    }
  },
  modules: [
    '@nuxt/ui',
    '@vite-pwa/nuxt'
  ],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Calizas',
      short_name: 'Calizas',
      description: 'Caracterización y valorización de calizas',
      lang: 'es',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: '#059669',
      background_color: '#f8fafc',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' }]
    },
    devOptions: { enabled: false }
  },
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
