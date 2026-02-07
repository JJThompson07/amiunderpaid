<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
    <div
      class="absolute top-0 left-0 w-full h-[400px] bg-linear-to-b from-secondary-900 to-slate-50 z-0"></div>

    <div class="relative z-10 w-full max-w-md">
      <!-- 
        NAVIGATION 
      -->
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 mb-6 text-sm font-semibold transition-colors text-slate-300 hover:text-white">
        <ArrowLeft class="w-4 h-4" />
        Back to search
      </NuxtLink>

      <!-- 
        LOGIN CARD 
      -->
      <div class="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-2xl">
        <!-- HEADER SECTION: Icon and Titles -->
        <div class="mb-8 text-center">
          <div
            class="w-16 h-16 bg-secondary-50 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-4 border border-secondary-100">
            <Lock class="w-8 h-8" />
          </div>
          <h1 class="text-2xl font-black text-slate-900">Admin Portal</h1>
          <p class="text-slate-500 text-sm mt-1">Sign in to manage salary benchmarks</p>
        </div>

        <!-- 
          AUTH FORM 
          Submits via AJAX using the handleLogin method.
        -->
        <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- EMAIL INPUT: Uses the custom AmIInput component -->
          <AmIInput
            v-model="email"
            label="Email Address"
            placeholder="admin@amiunderpaid.com"
            :icon="Mail" />

          <!-- PASSWORD INPUT: Set to type="password" for security -->
          <AmIInput
            v-model="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            :icon="KeyRound"
            @keyup.enter="handleLogin" />

          <!-- 
            ERROR DISPLAY 
            Only renders if the 'error' ref has a value.
          -->
          <div
            v-if="error"
            class="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
            {{ error }}
          </div>

          <!-- SUBMIT BUTTON -->
          <div class="pt-2">
            <AmIAnimatedBorder :loading="loading" active-bg-colour="bg-slate-400">
              <AmIButton
                title="login"
                block
                :disabled="loading"
                type="submit"
                @click.prevent="handleLogin">
                <div class="flex items-center justify-center gap-2">
                  <span
                    v-if="loading"
                    class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>{{ loading ? 'Verifying...' : 'Sign In' }}</span>
                </div>
              </AmIButton>
            </AmIAnimatedBorder>
          </div>
        </form>

        <!-- FOOTER -->
        <p class="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Protected Environment
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { ref } from 'vue';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-vue-next';
import { useFirebaseAuth } from 'vuefire';
import { signInWithEmailAndPassword } from 'firebase/auth';

// ** data & refs **
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const auth = useFirebaseAuth();
const route = useRoute();

// ** methods **
const handleLogin = async () => {
  // 1. Pre-flight validation
  if (!auth) {
    error.value = 'The authentication service is not ready. Please refresh.';
    return;
  }

  if (!email.value || !password.value) {
    error.value = 'Please provide both your email and password.';
    return;
  }

  // 2. State initialization
  loading.value = true;
  error.value = '';

  try {
    // 3. Firebase sign-in request
    await signInWithEmailAndPassword(auth, email.value, password.value);

    // 4. Success redirection logic
    const redirectPath = route.query.redirect?.toString() || '/admin/seed';
    await navigateTo(redirectPath);
  } catch (e: any) {
    // 5. Error mapping for common Firebase codes
    console.error('[Login Error]:', e.code);

    switch (e.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        error.value = 'The email or password entered is incorrect.';
        break;
      case 'auth/too-many-requests':
        error.value = 'Security lock: Too many failed attempts. Try again later.';
        break;
      default:
        error.value = 'An unexpected error occurred during sign in.';
    }
  } finally {
    // 6. Cleanup loading state
    loading.value = false;
  }
};
</script>
