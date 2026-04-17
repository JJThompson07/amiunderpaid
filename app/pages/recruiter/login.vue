<template>
  <div class="min-h-screen w-full grid lg:grid-cols-2 bg-slate-50">
    <div class="flex-1 flex flex-col relative bg-slate-50">
      <AmIFormLogin
        class="h-full min-h-max"
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
    </div>

    <div
      class="flex-1 bg-secondary-900 text-white flex flex-col justify-center items-center p-6 md:p-12 xl:p-24 relative overflow-hidden">
      <div class="relative z-10 max-w-lg">
        <h2 class="text-3xl xl:text-3xl font-black mb-12 text-white leading-tight">
          {{ $t('login.recruiter.benefits.title', { title: SiteTitle }) }}
        </h2>

        <div class="space-y-6">
          <div v-for="(benefit, index) in benefits" :key="index" class="flex gap-5">
            <div
              class="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 border border-white/15 shadow-inner">
              <component :is="benefit.icon" class="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 class="text-base font-bold text-white mb-1.5">{{ benefit.title }}</h3>
              <p class="text-slate-200 text-xs leading-relaxed">{{ benefit.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Imported the additional icons needed for the right column!
import {
  BriefcaseBusiness,
  UserRoundPlus,
  MapPinIcon,
  TargetIcon,
  CalendarDaysIcon,
  MagnetIcon,
  LockIcon,
  UserStarIcon
} from 'lucide-vue-next';

definePageMeta({
  layout: 'login-layout'
});

const { login, signup, loading, error } = useRecruiterAuth();
const { t } = useI18n();

const { $siteBrand } = useNuxtApp();

const SiteTitle = computed<string>(() => {
  return $siteBrand === 'benchmarkmyrole'
    ? 'BenchmarkMyRole & AmIUnderpaid'
    : 'AmIUnderpaid & BenchmarkMyRole';
});

const localError = ref('');

const benefits = computed(() => [
  {
    icon: MapPinIcon,
    title: t('login.recruiter.benefits.item-1-title'),
    desc: t('login.recruiter.benefits.item-1-desc')
  },
  {
    icon: UserStarIcon,
    title: t('login.recruiter.benefits.item-2-title'),
    desc: t('login.recruiter.benefits.item-2-desc')
  },
  {
    icon: TargetIcon,
    title: t('login.recruiter.benefits.item-3-title'),
    desc: t('login.recruiter.benefits.item-3-desc')
  },
  {
    icon: LockIcon,
    title: t('login.recruiter.benefits.item-4-title'),
    desc: t('login.recruiter.benefits.item-4-desc')
  },
  {
    icon: MagnetIcon,
    title: t('login.recruiter.benefits.item-5-title'),
    desc: t('login.recruiter.benefits.item-5-desc')
  },
  {
    icon: CalendarDaysIcon,
    title: t('login.recruiter.benefits.item-6-title'),
    desc: t('login.recruiter.benefits.item-6-desc')
  }
]);

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

  const success = await signup(credentials.email, credentials.password);

  if (success) {
    await navigateTo('/recruiter/onboarding');
  }
};
</script>
