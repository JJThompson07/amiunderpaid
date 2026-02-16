// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite';

// Debug: Check if env vars are loaded
if (!process.env.FIREBASE_API_KEY) {
  console.warn('⚠️  WARNING: FIREBASE_API_KEY is missing from process.env!');
}

// // --- ADD THIS DEBUG BLOCK ---
// console.log('-------------------------------------------');
// console.log(
//   'DEBUG: GOOGLE_SERVICE_ACCOUNT length:',
//   process.env.GOOGLE_SERVICE_ACCOUNT?.length || 0
// );
// if (process.env.GOOGLE_SERVICE_ACCOUNT) {
//   try {
//     JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
//     console.log('DEBUG: JSON Parse Success! ✅');
//   } catch (e) {
//     console.error('DEBUG: JSON Parse FAILED ❌', e.message);
//   }
// } else {
//   console.log('DEBUG: Variable is undefined/empty');
// }
// console.log('-------------------------------------------');
// // ----------------------------

export default defineNuxtConfig({
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
    '/privacy-policy': { swr: 86400 },

    // Homepage can be shorter if you feature "trending" jobs, otherwise 24h is fine too
    '/': { swr: 86400 }
  },

  // ** 3. Register Modules **
  modules: ['@nuxt/eslint', '@vueuse/nuxt', 'nuxt-vuefire', 'nuxt-gtag', '@nuxtjs/algolia'],

  algolia: {
    apiKey: process.env.ALGOLIA_SEARCH_API_KEY,
    applicationId: process.env.ALGOLIA_APPLICATION_ID
  },

  // ** 4. VueFire Configuration **
  vuefire: {
    auth: {
      enabled: true,
      // CHANGE THIS TO TRUE so the server knows the user is logged in
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
    // admin: {
    //   serviceAccount: (() => {
    //     if (!process.env.GOOGLE_SERVICE_ACCOUNT) return undefined;

    //     try {
    //       const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

    //       // CRITICAL FIX: Replace literal "\n" strings with actual newline characters
    //       if (sa.private_key) {
    //         sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    //       }

    //       return sa;
    //     } catch (e) {
    //       console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT', e);
    //       return undefined;
    //     }
    //   })()
    // }
  },

  gtag: {
    id: 'G-EZQYZSSRW1'
  },

  // ** 5. Runtime Config **
  runtimeConfig: {
    ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
    ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
    public: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      adminAccessKey: process.env.NUXT_ADMIN_ACCESS_KEY,
      gtagId: 'G-EZQYZSSRW1'
    }
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
