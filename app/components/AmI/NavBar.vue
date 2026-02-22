<template>
  <nav
    class="flex flex-1 items-center gap-6 font-medium"
    :class="
      safeIsMobile
        ? 'fixed inset-0 bg-slate-200 z-40 p-4 pt-20 flex-col text-slate-800 gap-6 animate-in slide-in-from-top-10 fade-in duration-300'
        : 'text-sm text-slate-600 justify-center gap-8'
    ">
    <template v-if="isAdmin">
      <NuxtLink
        v-for="link in visibleAdminLinks"
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
        @click="handleClick(link.to)"
        >{{ link.label }}</NuxtLink
      >
      <NuxtLink
        v-if="safeIsMobile"
        to="/privacy-policy"
        class="transition-colors text-center text-primary-600 bg-slate-100 shadow-md w-full p-4 rounded-lg focus:text-slate-900 focus:outline-0 focus:bg-slate-300"
        @click="handleClick('/privacy-policy')"
        >Privacy Policy</NuxtLink
      >
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
const safeIsMobile = computed(() => isMounted.value && props.isMobile);

const { trackPageNav } = useAnalytics();

const adminLinks = [
  {
    to: '/',
    label: 'Home',
    mobileOnly: true
  },
  {
    to: '/admin/seed',
    label: 'Seeder'
  },
  {
    to: '/admin/coding-index',
    label: 'Coding Index'
  },
  {
    to: '/admin/adzuna',
    label: 'Adzuna API'
  },
  {
    to: '/admin/jobs-cache',
    label: 'Jobs Cache'
  }
];

const navLinks = [
  {
    to: '/',
    label: 'Home',
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400',
    mobileOnly: true
  },
  {
    to: '/how-it-works',
    label: 'How it works',
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400'
  },
  {
    to: '/data-sources',
    label: 'Data Sources',
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400'
  },
  {
    to: '/about',
    label: 'About',
    mobileColorClass: 'text-white bg-primary-500 focus:bg-primary-400'
  }
];

const visibleAdminLinks = computed(() =>
  adminLinks.filter((link) => !link.mobileOnly || safeIsMobile.value)
);
const visibleNavLinks = computed(() =>
  navLinks.filter((link) => !link.mobileOnly || safeIsMobile.value)
);

const handleClick = (to: string) => {
  emit('close');
  trackPageNav(to);
};
</script>

<style scoped></style>
