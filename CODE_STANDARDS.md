# Codebase Standards & Guidelines

You are an AI assistant helping to build a dual-tenant, server-side rendered (SSR) platform (AmIUnderpaid & BenchmarkMyRole). Please strictly adhere to the following architecture, tech stack, and conventions.

## 1. Core Tech Stack

- **Framework:** Nuxt 4 (Nitro server engine)
- **UI Component Library:** Vue 3 (Composition API)
- **Styling:** Tailwind CSS v4
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

## 8. Unit Testing

- **Framework:** Vitest
- **Requirement:** Unit tests are strictly required for all new core utilities (`~/shared/utils/`, `~/server/utils/`) and composables (`~/app/composables/`).
- **Execution:** All changes MUST pass the test suite (`pnpm vitest run`) before being committed or archived.
- **Location:** Tests should be located in a `tests/` directory adjacent to the file being tested (e.g., `~/shared/utils/tests/math.spec.ts`).

## 9. Security & Credentials

These rules are **non-negotiable** and must be applied uniformly across all server-side code.

### 9.1 Credential Access — Private `runtimeConfig` Only

All secrets and API credentials (API keys, service account JSON, webhook secrets) **MUST** be read exclusively from Nuxt's private `runtimeConfig`. This is the only mechanism that prevents secrets from leaking into the client bundle.

```typescript
// ✅ CORRECT — private runtimeConfig, server-only
const config = useRuntimeConfig();
const apiKey = config.myServiceApiKey;

// ❌ FORBIDDEN — bypasses Nuxt's validation layer, may leak to client
const apiKey = process.env.MY_SERVICE_API_KEY;

// ❌ FORBIDDEN — config.public is serialised into the client bundle
const apiKey = config.public.myServiceApiKey;

// ❌ FORBIDDEN — chained fallbacks that permit public/env access
const apiKey = config.myKey || config.public?.myKey || process.env.MY_KEY;
```

### 9.2 Register All Secrets in `nuxt.config.ts`

Every secret used by a server route or utility **MUST** be declared in the `runtimeConfig` block in `nuxt.config.ts`. Secrets not registered here will not be validated at startup.

```typescript
runtimeConfig: {
  myServiceApiKey: process.env.MY_SERVICE_API_KEY, // ✅ declared here, accessed via config
  public: {
    // Only non-sensitive values live here — this is sent to the browser
  }
}
```

### 9.3 Opaque Error Messages

Server error messages returned to the client **MUST NOT** reveal:

- Provider or vendor names (e.g. `'Adzuna'`, `'Reed'`)
- Country routing logic (e.g. `for ${countryCode}`)
- Internal infrastructure topology

```typescript
// ✅ CORRECT — opaque, user-friendly
throw createError({ statusCode: 503, statusMessage: 'Market data temporarily unavailable.' });

// ❌ FORBIDDEN — leaks internal architecture
throw createError({
  statusCode: 500,
  statusMessage: `Failed to fetch Adzuna jobs for ${countryCode}`
});
```

Use `503 Service Unavailable` (not `500`) when the failure is caused by a downstream provider being rate-limited or unavailable, as this is semantically correct and helps downstream monitoring tools.

### 9.4 Error Status Codes

| Scenario                                              | Correct Status Code |
| ----------------------------------------------------- | ------------------- |
| Downstream provider rate-limited (429) or unavailable | `503`               |
| Missing or misconfigured server credentials           | `500`               |
| Invalid client input                                  | `400`               |
| Unauthenticated request                               | `401`               |
| Authorised but forbidden resource                     | `403`               |

### 9.5 Dev-Only Features

Features that exist only for local development **MUST** be gated behind both:

- `process.dev` on the server side (Nitro handlers)
- `import.meta.dev` on the client side (Vue components / composables)

This guarantees zero surface area in production builds.

## 10. TypeScript Strictness & Build Integrity

- **No `any` Types:** Avoid using `any` type casting or implicit `any` variables whenever possible. Explicitly define interfaces or use generic types (e.g. `Array<{ title: string }>` or `Record<string, unknown>`).
- **Strict Null Checks:** Always handle potential `null` or `undefined` values. Use non-null assertions (`!`) only when you are absolutely certain the value exists, otherwise use optional chaining (`?.`) or fallback values (`||`).
- **No Typecheck Errors:** All TypeScript errors MUST be resolved before a PR can be merged. The build pipeline (`pnpm nuxi typecheck`) must exit with 0 errors (ignoring internal framework warnings like `vue-router/volar`).
- **Zero Broken Builds:** You must run `nuxi typecheck` to verify that there are no regressions or type-related compilation breaks after making significant refactors.
