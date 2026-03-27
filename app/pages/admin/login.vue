<template>
  <div v-if="!isAccessGranted">
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

  <AmIFormLogin
    v-else
    :icon="Lock"
    :title="$t('login.admin.title')"
    :subtitle="$t('login.admin.subtitle')"
    :email-label="$t('login.admin.email-label')"
    :email-placeholder="$t('login.admin.email-placeholder')"
    :footer-text="$t('login.admin.footer-text')"
    :allow-signup="false"
    :loading="loading"
    :error="localError || error"
    @login="handleLogin"
    @clear-error="clearError" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Lock } from 'lucide-vue-next';

const route = useRoute();
const config = useRuntimeConfig();

// Using your existing admin composable
const { login, loading, error } = useAdminAuth();

const localError = ref('');

// The secret query string check
const isAccessGranted = computed(() => {
  return route.query.access === config.public.adminAccessKey;
});

const clearError = () => {
  localError.value = '';
  error.value = '';
};

const handleLogin = async (credentials: any) => {
  clearError();

  if (!credentials.email || !credentials.password) {
    localError.value = 'Please provide both your email and password.';
    return;
  }

  // Pass credentials from the shared component to your composable
  const success = await login(credentials.email, credentials.password);

  // Redirect if successful
  if (success) {
    const redirectPath = route.query.redirect?.toString() || '/admin/coding-index';
    await navigateTo(redirectPath);
  }
};
</script>
