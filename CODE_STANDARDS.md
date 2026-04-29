# Codebase Standards & Guidelines

You are an AI assistant helping to build a dual-tenant, server-side rendered (SSR) platform (AmIUnderpaid & BenchmarkMyRole). Please strictly adhere to the following architecture, tech stack, and conventions.

## 1. Core Tech Stack

- **Framework:** Nuxt 3 (Nitro server engine)
- **UI Component Library:** Vue 3 (Composition API)
- **Styling:** Tailwind CSS v3
- **Database & Auth:** Firebase (Firestore, Auth)
- **Firebase Libraries:** `vuefire` (Client), `firebase-admin` (Server)
- **Language:** TypeScript (Strict mode)
- **Icons:** `lucide-vue-next`
- **Internationalization:** `@nuxtjs/i18n` (vue-i18n)
- **Payments:** Stripe

## 2. Vue & Nuxt Architecture

- **Script Setup:** Always use `<script setup lang="ts">`. Never use the Options API.
- **Auto-Imports:** Rely on Nuxt's auto-import functionality. Do not manually import Vue composables (`ref`, `computed`, `watch`) or Nuxt composables (`useRouter`, `MapsTo`) unless explicitly required. Do not manually import components from the `~/components` directory.
- **Composables:** Encapsulate reusable business logic inside the `~/composables/` directory (e.g., `useRecruiterAuth()`, `useSystemToast()`).
- **State Management:** Use Nuxt `useState()` for global reactive state. Do not use Pinia or Vuex.

## 3. The Golden Rule of Firebase & Vuefire

- **UI Reactivity:** NEVER use `useFirebaseAuth()?.currentUser` to check reactive user state in the UI. **Always use Vuefire's `useCurrentUser()`** when you need a reactive reference to the user (e.g., checking `emailVerified`, grabbing `uid`, or calling `getIdToken()`).
- **Firebase Actions:** Only use `useFirebaseAuth()` when passing the auth instance to raw Firebase SDK functions (e.g., `signInWithEmailAndPassword(auth, ...)`, `sendEmailVerification(auth.currentUser)`, or `signOut(auth)`).
- **Auth Hydration:** You may use `useFirebaseAuth()` to call `await auth.authStateReady()` before accessing tokens to ensure Vuefire has fully hydrated the client state.
- **Client Firestore:** Use Vuefire's `useFirestore()`, `useCollection()`, and `useDocument()` for reactive real-time database queries on the frontend.
- **Server Firestore:** Use `firebase-admin/firestore` in Nitro API routes.

## 4. Component Conventions

- **Global / Generic Components:** All reusable base UI components are prefixed with `AmI` (e.g., `AmIButton`, `AmITable`, `AmIInputGeneric`).
- **Modals & Toasts:** Modals are prefixed with `Modal` (e.g., `ModalForgotPassword.vue`). Toasts are prefixed with `Toast` (e.g., `ToastGeneric.vue`, `ToastNotification.vue`).
- **Props & Emits:** Use explicit `defineProps` and `defineEmits`. Type complex props using `PropType` from `vue`.
- **Multi-Tenancy:** When UI needs to change based on the current site, use `const { $siteBrand } = useNuxtApp()`.

## 5. Styling (Tailwind CSS)

- Always use utility-first Tailwind classes.
- Avoid custom CSS blocks in `<style scoped>` unless handling highly specific external library overrides (like ECharts or custom scrollbars).
- Use `animate-in`, `fade-in`, `slide-in-from-*` for simple micro-interactions and enter transitions.

## 6. Internationalization (i18n)

- **No Hardcoded Strings:** Any text that is visual on the site should be done through the language files, unless it is within the Admin section (`~/pages/admin/`) where hardcoded strings are acceptable.
- Always use the translation function `$t('key')` in templates, and `const { t } = useI18n()` inside `<script setup>`.
- Keep translation keys organized hierarchically in JSON files located in `i18n/locales/`.

## 7. Server API Routes (Nitro)

- API routes live in `~/server/api/`.
- **Security:** All authenticated endpoints must verify the user's Firebase token.
  ```typescript
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) return createError({ statusCode: 401 });
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token);
  const userId = decodedToken.uid;
  ```
