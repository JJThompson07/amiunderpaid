// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY) {
  // if no key then we want to fail immediately
  throw new Error(
    'FATAL CONFIG ERROR: FIREBASE_API_KEY is missing from environment variables. The application cannot start.'
  );
}

const isDev = process.env.NODE_ENV === 'development';

export default defineNuxtConfig({
  // Enable Nuxt 4 features and directory structure
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // ** 1. ENABLE SERVER-SIDE RENDERING **
  // This must be true for SEO and Caching to work
  ssr: true,

  // ** 2. CONFIGURE CACHING (Route Rules) **
  routeRules: {
    // Cache salary pages for 24 hours (86400 seconds)
    '/salary/**': { swr: 86400 },

    // Keep static pages at 24 hours
    '/about': { swr: 86400 },
    '/how-it-works': { swr: 86400 },
    '/data-sources': { swr: 86400 },
    '/privacy-policy': { swr: 86400 }
  },

  css: ['~/assets/css/main.css'],

  // ** 3. Register Modules **
  modules: [
    '@nuxt/eslint',
    '@vueuse/nuxt',
    'nuxt-vuefire',
    'nuxt-gtag',
    '@nuxtjs/algolia',
    '@nuxtjs/i18n'
  ],

  algolia: {
    apiKey: process.env.ALGOLIA_SEARCH_API_KEY,
    applicationId: process.env.ALGOLIA_APPLICATION_ID
  },

  // ** 4. VueFire Configuration **
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: true
    },
    config: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    }
  },

  i18n: {
    langDir: 'locales',

    // 1. Set the default locale to your UK code
    defaultLocale: 'en-GB',
    strategy: 'no_prefix',

    differentDomains: true,

    // 2. Set the baseUrl to your default domain for canonical fallbacks
    baseUrl: isDev ? 'http://localhost:3000' : 'https://www.amiunderpaid.co.uk',

    locales: [
      {
        code: 'en',
        iso: 'en',
        file: 'en-GB/index.ts'
      },
      {
        code: 'en-GB',
        iso: 'en-GB',
        domain: isDev ? 'localhost:3000' : 'www.amiunderpaid.co.uk',
        file: 'en-GB/index.ts'
      },
      {
        code: 'en-US',
        iso: 'en-US',
        domain: isDev ? 'localhost:3000' : 'www.amiunderpaid.com',
        file: 'en-US/index.ts'
      }
    ],

    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'en-GB'
    }
  },

  gtag: {
    id: 'G-EZQYZSSRW1'
  },

  // ** 5. Runtime Config **
  runtimeConfig: {
    adzunaAppId: process.env.ADZUNA_APP_ID,
    adzunaAppKey: process.env.ADZUNA_APP_KEY,
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,

    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      adminAccessKey: process.env.NUXT_ADMIN_ACCESS_KEY,
      gtagId: 'G-EZQYZSSRW1'
    }
  },

  // ** 6. Vite / Tailwind **
  vite: {
    plugins: [tailwindcss() as any],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules') &&
              (id.includes('firebase') || id.includes('@firebase'))
            ) {
              return 'firebase';
            }
          }
        }
      }
    }
  }
});
