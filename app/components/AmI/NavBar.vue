<template>
  <nav
    class="flex flex-1 items-center gap-6 font-medium"
    :class="
      safeIsMobile
        ? 'fixed inset-0 bg-slate-200 z-40 p-4 pt-20 flex-col text-slate-800 gap-6 animate-in slide-in-from-top-10 fade-in duration-300'
        : 'text-sm text-slate-600 justify-center gap-8'
    ">
    <template v-if="isAdmin && !isRoleLoading">
      <NuxtLink
        v-for="link in visibleAdminLinks"
        :key="link.to"
        :to="link.to"
        class="transition-colors hover:text-primary-600"
        @click="$emit('close')"
        >{{ link.label }}</NuxtLink
      >
    </template>
    <template v-else-if="isRecruiter && !isRoleLoading">
      <NuxtLink
        v-for="link in visibleRecruiterLinks"
        :key="link.to"
        :to="link.to"
        class="transition-colors hover:text-primary-600"
        @click="$emit('close')"
        >{{ link.label }}</NuxtLink
      >
    </template>
    <template v-else>
      <NuxtLink
        v-for="link in visibleNavLinks"
        :key="link.to"
        :to="link.to"
        class="transition-colors text-center focus:outline-0"
        :class="
          safeIsMobile
            ? `shadow-md w-full p-4 rounded-lg ${link.mobileColorClass}`
            : 'hover:text-primary-600 focus:text-primary-600'
        "
        @click="$emit('close')"
        >{{ link.label }}</NuxtLink
      >
      <NuxtLink
        v-if="safeIsMobile"
        to="/privacy-policy"
        class="transition-colors text-center text-primary-600 bg-slate-100 shadow-md w-full p-4 rounded-lg focus:text-slate-900 focus:outline-0 focus:bg-slate-300"
        @click="$emit('close')"
        >Privacy Policy</NuxtLink
      >
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);

const { isAdmin, isRecruiter, isRoleLoading } = useUserRole();

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
const safeIsMobile = computed(() => isMounted.value && props.isMobile);

const adminLinks = [
  {
    to: '/',
    label: $t('navbar.home'),
    mobileOnly: true
  },
  {
    to: '/admin/seed',
    label: $t('navbar.seeder'),
    mobileOnly: false
  },
  {
    to: '/admin/coding-index',
    label: $t('navbar.coding-index'),
    mobileOnly: false
  },
  {
    to: '/admin/adzuna',
    label: $t('navbar.adzuna-api'),
    mobileOnly: false
  },
  {
    to: '/admin/jobs-cache',
    label: $t('navbar.jobs-cache'),
    mobileOnly: false
  },
  {
    to: '/admin/banding',
    label: $t('navbar.banding'),
    mobileOnly: false
  },
  {
    to: '/admin/user-suggestions',
    label: $t('navbar.user-suggestions'),
    mobileOnly: false
  },
  {
    to: '/admin/job-groups',
    label: $t('navbar.job-groups'),
    mobileOnly: false
  }
];

const recruiterLinks = [
  {
    to: '/recruiter/dashboard',
    label: $t('navbar.home'),
    mobileOnly: true
  },
  {
    to: '/recruiter/dashboard',
    label: $t('navbar.dashboard'),
    mobileOnly: false
  },
  {
    to: '/recruiter/territories',
    label: $t('navbar.territories'),
    mobileOnly: false
  }
];

const navLinks = [
  {
    to: '/',
    label: $t('navbar.home'),
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: false
  },
  {
    to: '/how-it-works',
    label: $t('navbar.how-it-works'),
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: false
  },
  {
    to: '/data-sources',
    label: $t('navbar.data-sources'),
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: false
  },
  {
    to: '/about',
    label: $t('navbar.about'),
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: false
  },
  {
    to: '/frequently-asked-questions',
    label: $t('navbar.faq-short'),
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: false
  }
];

const visibleAdminLinks = computed(() =>
  adminLinks.filter((link) => !link.mobileOnly || safeIsMobile.value)
);
const visibleRecruiterLinks = computed(() =>
  recruiterLinks.filter((link) => !link.mobileOnly || safeIsMobile.value)
);
const visibleNavLinks = computed(() =>
  navLinks.filter((link) => !link.mobileOnly || safeIsMobile.value)
);
</script>

<style scoped></style>
