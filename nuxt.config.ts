import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY) {
  console.warn('⚠️  WARNING: FIREBASE_API_KEY is missing from process.env!');
}

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // ** Server-Side Rendering **
  // Enabled globally for SEO, but disabled for Admin routes via routeRules below
  ssr: true,

  // ** 1. Register Modules **
  modules: ['@nuxt/eslint', '@vueuse/nuxt', 'nuxt-vuefire', 'nuxt-gtag', '@nuxtjs/algolia'],

  algolia: {
    apiKey: process.env.ALGOLIA_SEARCH_API_KEY,
    applicationId: process.env.ALGOLIA_APPLICATION_ID
  },

  // ** 2. VueFire Configuration **
  vuefire: {
    auth: {
      enabled: true,
      sessionCookie: false
    },
    config: {
      // Using fallback strings to prevent the SDK from crashing if .env fails to load
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    }
  },

  gtag: {
    id: 'G-EZQYZSSRW1'
  },

  routeRules: {
    // Admin pages should be SPA-only to handle client-side auth easily
    '/admin/**': { ssr: false },
    '/login': { ssr: false },

    // Cache the API responses for 1 day to boost SEO performance
    // This handles the dynamic title, country, and optional location
    '/api/salary/**': { 
      swr: 60 * 60 * 24, // 24 hours
      cache: {
        // This ensures /api/salary/nurse/uk is cached separately from /api/salary/dev/uk
        varies: ['query'] 
      }
    },
    // Cache the Salary Result pages for 1 day to boost SEO performance
    '/salary/**': { 
      swr: 60 * 60 * 24 // 24 hours
    },
  },

  // ** 3. Runtime Config **
  // This helps Nuxt track these variables for client/server consistency
  runtimeConfig: {
    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID
    }
  },

  // ** 4. Vite / Tailwind **
  vite: {
    plugins: [tailwindcss()]
  }
});
