// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY && !process.env.CI && process.env.NODE_ENV !== 'test') {
  // if no key then we want to fail immediately
  throw new Error(
    'FATAL CONFIG ERROR: FIREBASE_API_KEY is missing from environment variables. The application cannot start.'
  );
}

// NOTE: GOOGLE_APPLICATION_CREDENTIALS (needed by vuefire's own admin app —
// see server/plugins/1.firebaseInit.ts) is deliberately NOT set here. This
// top-level nuxt.config.ts code only runs during `nuxt build`; on serverless
// platforms (Vercel) the build and the deployed runtime function are separate
// processes/containers, so a process.env mutation here never reaches request
// handling at runtime. It must be set at Nitro runtime startup instead.

const isDev = process.env.NODE_ENV !== 'production';
const isE2E = process.env.E2E === 'true';
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
  ssr: true,

  // ** 2. CONFIGURE CACHING & HYBRID RENDERING (Route Rules) **
  // SWR caching on /salary/**|/benchmark/** doesn't vary by cookie, so it
  // would silently ignore the devProviderOverride cookie (see
  // useDevProviderOverride.ts) — the first request to a given URL/build
  // populates the cache and every subsequent request gets served that same
  // response regardless of cookie. Disable it during e2e runs so the
  // fallback-provider tests (and local dev toggling) see the override
  // rather than a stale/unrelated cached render.
  routeRules:
    isDev || isE2E
      ? {
          // In E2E dev, we must disable SSR for protected routes to ensure Firebase auth stability
          '/recruiter/**': { ssr: false },
          '/admin/**': { ssr: false }
        }
      : {
          '/salary/**': { swr: DAY_IN_S, ssr: true },
          '/benchmark/**': { swr: DAY_IN_S, ssr: true },
          '/sitemap.xml': { swr: 86400 },
          // Always disable SSR for highly dynamic, user-specific auth routes
          '/recruiter/**': { ssr: false },
          '/admin/**': { ssr: false }
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
    algoliaAdminApiKey:
      process.env.ALGOLIA_ADMIN_KEY ||
      process.env.ALGOLIA_ADMIN_API_KEY ||
      process.env.ALGOLIA_API_KEY,

    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      adminAccessKey: process.env.NUXT_ADMIN_ACCESS_KEY,
      gtagId: 'G-EZQYZSSRW1',
      stripePublicKey: process.env.NUXT_PUBLIC_STRIPE_KEY,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://amiunderpaid.co.uk'
    },

    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    searchTokenSecret: process.env.SEARCH_TOKEN_SECRET,
    // Named CRON_SECRET (not a custom name) to match Vercel's own reserved
    // convention: Vercel automatically sends this env var's value as the
    // Authorization: Bearer header when it invokes a scheduled cron job.
    cronSecret: process.env.CRON_SECRET
  },

  // ** 6. Vite / Tailwind **
  vite: {
    plugins: [tailwindcss()],
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
