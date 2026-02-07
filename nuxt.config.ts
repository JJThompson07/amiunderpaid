import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY) {
  console.warn('⚠️  WARNING: FIREBASE_API_KEY is missing from process.env!');
}

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // ** Server-Side Rendering **
  // disable globally for SEO
  ssr: false,

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

  // ** 3. Runtime Config **
  // This helps Nuxt track these variables for client/server consistency
  runtimeConfig: {
    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      adminAccessKey: process.env.NUXT_ADMIN_ACCESS_KEY
    }
  },

  // ** 4. Vite / Tailwind **
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules') && (id.includes('firebase') || id.includes('@firebase'))) {
              return 'firebase';
            }
          }
        }
      }
    }
  }
});
