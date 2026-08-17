// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY) {
  // if no key then we want to fail immediately
  throw new Error(
    'FATAL CONFIG ERROR: FIREBASE_API_KEY is missing from environment variables. The application cannot start.'
  );
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString(
      'utf-8'
    );
    // Parse and stringify to guarantee it is a single-line string
    const singleLineJson = JSON.stringify(JSON.parse(decoded));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = singleLineJson;
  } catch (error) {
    console.error('⚠️ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64', error);
  }
}

const isDev = process.env.NODE_ENV !== 'production';
const DAY_IN_S = 86400;

export default defineNuxtConfig({
  // Enable Nuxt 4 features and directory structure
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  imports: {
    dirs: ['shared/utils/**']
  },

  // ** 1. ENABLE SERVER-SIDE RENDERING **
  // This must be true for SEO and Caching to work
  ssr: !process.env.E2E,

  // ** 2. CONFIGURE CACHING (Route Rules) **
  routeRules: isDev
    ? {}
    : {
        '/salary/**': { swr: DAY_IN_S },
        '/benchmark/**': { swr: DAY_IN_S }
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
    baseUrl: 'https://www.amiunderpaid.com',
    langDir: 'locales',
    defaultLocale: 'en-GB',
    strategy: 'no_prefix',
    differentDomains: !process.env.E2E,
    multiDomainLocales: !process.env.E2E,

    locales: [
      {
        code: 'en-GB',
        iso: 'en-GB',
        language: 'en-GB',
        file: 'en-GB/index.ts',
        domain: isDev ? 'localhost:3000' : 'www.amiunderpaid.co.uk',
        // Update the dev domain here
        domains: isDev
          ? ['localhost:3000', '127.0.0.1:3000', 'ami-uk.localhost:3000', 'bmr.localhost:3000']
          : ['www.amiunderpaid.co.uk', 'www.benchmarkmyrole.com']
      },
      {
        code: 'en-US',
        iso: 'en-US',
        language: 'en-US',
        file: 'en-US/index.ts',
        domain: isDev ? 'ami-us.localhost:3000' : 'www.amiunderpaid.com',
        // Update both dev domains here
        domains: isDev
          ? ['ami-us.localhost:3000', 'bmr.us.localhost:3000']
          : ['www.amiunderpaid.com', 'www.benchmarkmyrole.com']
      }
    ],

    // Pointing to your external file handles the defineI18nConfig issue
    vueI18n: './i18n.config.ts',

    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'en-US'
    }
  },

  gtag: {
    id: 'G-EZQYZSSRW1'
  },

  // ** 5. Runtime Config **
  runtimeConfig: {
    adzunaAppId: process.env.ADZUNA_APP_ID,
    adzunaAppKey: process.env.ADZUNA_APP_KEY,
    reedApiKey: process.env.REED_API_KEY,
    joobleApiKey: process.env.JOOBLE_API_KEY,
    algoliaApplicationId: process.env.ALGOLIA_APPLICATION_ID,
    algoliaAdminApiKey: process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_API_KEY,

    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      adminAccessKey: process.env.NUXT_ADMIN_ACCESS_KEY,
      gtagId: 'G-EZQYZSSRW1',
      stripePublicKey: process.env.NUXT_PUBLIC_STRIPE_KEY,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://amiunderpaid.co.uk'
    },

    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET
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
