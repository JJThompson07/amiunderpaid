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
const DAY_IN_S = 86400;

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
  routeRules: isDev
    ? {}
    : {
        '/salary/**': { swr: DAY_IN_S },
        '/benchmark/**': { swr: DAY_IN_S },
        '/about': { swr: DAY_IN_S },
        '/how-it-works': { swr: DAY_IN_S },
        '/data-sources': { swr: DAY_IN_S },
        '/privacy-policy': { swr: DAY_IN_S }
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

  // nuxt.config.ts
  i18n: {
    langDir: 'locales',
    defaultLocale: 'en-GB',
    strategy: 'no_prefix',
    differentDomains: true,
    multiDomainLocales: true,

    locales: [
      {
        code: 'en-GB',
        iso: 'en-GB',
        language: 'en-GB',
        file: 'en-GB/index.ts',
        // Update the dev domain here
        domains: isDev ? ['ami-uk.localhost:3000'] : ['www.amiunderpaid.co.uk']
      },
      {
        code: 'en-US',
        iso: 'en-US',
        language: 'en-US',
        file: 'en-US/index.ts',
        // Update both dev domains here
        domains: isDev
          ? ['ami-us.localhost:3000', 'bmr.localhost:3000']
          : ['www.amiunderpaid.com', 'www.benchmarkmyrole.com']
      }
    ],

    // Pointing to your external file handles the defineI18nConfig issue
    vueI18n: './i18n.config.ts',

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
