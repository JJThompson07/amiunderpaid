<template>
  <AmIFormLogin
    :icon="BriefcaseBusiness"
    :signup-icon="UserRoundPlus"
    :title="$t('login.recruiter.login-title')"
    :subtitle="$t('login.recruiter.login-subtitle')"
    :signup-title="$t('login.recruiter.signup-title')"
    :signup-subtitle="$t('login.recruiter.signup-subtitle')"
    :email-label="$t('login.recruiter.email-label')"
    :email-placeholder="$t('login.recruiter.email-placeholder')"
    :toggle-signup-text="$t('login.recruiter.toggle-to-signup')"
    :toggle-login-text="$t('login.recruiter.toggle-to-login')"
    :footer-text="$t('login.recruiter.footer-text')"
    :allow-signup="true"
    :loading="loading"
    :error="localError || error"
    @login="handleLogin"
    @signup="handleSignup"
    @clear-error="clearError" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BriefcaseBusiness, UserRoundPlus } from 'lucide-vue-next';
const { login, signup, loading, error } = useRecruiterAuth();

const localError = ref('');

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

  // Actively using the `login` function and `credentials` payload
  const success = await login(credentials.email, credentials.password);

  if (success) {
    await navigateTo('/recruiter/dashboard');
  }
};

const handleSignup = async (credentials: any) => {
  clearError();

  if (!credentials.email || !credentials.password) {
    localError.value = 'Please provide both your email and password.';
    return;
  }

  // Actively using the `signup` function and `credentials` payload
  const success = await signup(credentials.email, credentials.password);

  if (success) {
    await navigateTo('/recruiter/onboarding');
  }
};
</script>
