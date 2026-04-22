<template>
  <AmIFormLogin
    :icon="Lock"
    :title="$t('login.admin.title')"
    :subtitle="$t('login.admin.subtitle')"
    :email-label="$t('login.admin.email-label')"
    :email-placeholder="$t('login.admin.email-placeholder')"
    :footer-text="$t('login.admin.footer-text')"
    :allow-signup="false"
    :password-label="$t('login.admin.user-password-label', 'User Password')"
    :password-placeholder="$t('login.admin.user-password-placeholder', 'Enter your user password')"
    :loading="loading"
    :error="localError || error"
    @login="handleLogin"
    @clear-error="clearError">
    <div class="mt-4">
      <AmIInputGeneric
        v-model="adminPassword"
        type="password"
        :label="$t('login.admin.admin-password-label', 'Admin Password')"
        :placeholder="
          $t('login.admin.admin-password-placeholder', 'Enter the Nuxt Admin password')
        " />
    </div>
  </AmIFormLogin>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next';

const route = useRoute();

// Using your existing admin composable
const { login, loading, error } = useAdminAuth();

const localError = ref('');
const adminPassword = ref('');
const { t } = useI18n();

const clearError = () => {
  localError.value = '';
  error.value = '';
};

const handleLogin = async (credentials: any) => {
  clearError();

  if (!credentials.email || !credentials.password || !adminPassword.value) {
    localError.value = t('auth.errors.invalid_credentials');
    return;
  }

  // Pass user credentials and the new admin password from the shared component to your composable
  const success = await login(credentials.email, credentials.password, adminPassword.value);

  // Redirect if successful
  if (success) {
    const redirectPath = route.query.redirect?.toString() || '/admin/coding-index';
    await navigateTo(redirectPath);
  }
};
</script>
