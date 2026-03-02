<template>
  <div
    v-if="isAccessGranted"
    class="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
    <div
      class="absolute top-0 left-0 w-full h-100 bg-linear-to-b from-secondary-900 to-slate-50 z-0"></div>

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
        <p class="mt-8 text-center text-2xs text-slate-400 uppercase tracking-widest font-bold">
          Protected Environment
        </p>
      </div>
    </div>
  </div>
  <div v-else>
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">404 Not Found</h2>
        <p class="text-slate-500 mb-6">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
        <NuxtLink to="/">
          <AmIButton title="Go to homepage" text-colour="text-white"> Go to homepage </AmIButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Mail, Lock, KeyRound, ArrowLeft } from 'lucide-vue-next';

const email = ref<string>('');
const password = ref<string>('');

const route = useRoute();
const config = useRuntimeConfig();

// Pull in the new composable
const { login, loading, error } = useAdminAuth();

const isAccessGranted = computed(() => {
  return route.query.access === config.public.adminAccessKey;
});

const handleLogin = async () => {
  if (!isAccessGranted.value) {
    error.value = 'Access denied.';
    return;
  }

  if (!email.value || !password.value) {
    error.value = 'Please provide both your email and password.';
    return;
  }

  // Pass credentials to the composable
  const success = await login(email.value, password.value);

  // Redirect if successful
  if (success) {
    const redirectPath = route.query.redirect?.toString() || '/admin/coding-index';
    await navigateTo(redirectPath);
  }
};
</script>
