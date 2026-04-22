<template>
  <nav
    class="flex flex-1 items-center gap-4 font-medium"
    :class="
      safeIsMobile
        ? 'fixed inset-0 bg-slate-200 z-40 p-4 pt-20 flex-col text-slate-800 gap-6 animate-in slide-in-from-top-10 fade-in duration-300 overflow-y-auto pb-24'
        : 'text-sm justify-center gap-8'
    ">
    <template v-for="link in activeLinks" :key="link.label">
      <template v-if="link.children">
        <div v-if="safeIsMobile" class="w-full">
          <span class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block pl-2">
            {{ link.label }}
          </span>
          <div class="flex flex-col gap-4 border-slate-300">
            <NuxtLink
              v-for="child in link.children"
              :key="child.to"
              :to="child.to"
              class="w-full p-3 rounded-lg bg-white shadow-sm font-bold text-slate-700 hover:text-primary-600 transition-colors"
              @click="$emit('close')">
              {{ child.label }}
            </NuxtLink>
          </div>
        </div>

        <div v-else class="relative group">
          <button
            class="flex items-center gap-1.5 py-2 text-slate-500 hover:text-primary-600 transition-colors font-bold outline-none">
            {{ link.label }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:-rotate-180 group-hover:text-primary-600"
              viewBox="0 0 20 20"
              fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd" />
            </svg>
          </button>

          <div
            class="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div
              class="bg-white rounded-xl shadow-xl border border-slate-100 p-2 flex flex-col min-w-55 gap-1">
              <NuxtLink
                v-for="child in link.children"
                :key="child.to"
                :to="child.to"
                active-class="bg-primary-50 text-primary-600"
                class="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-primary-50 hover:text-primary-600 transition-colors whitespace-nowrap"
                @click="$emit('close')">
                {{ child.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <NuxtLink
          :to="link.to"
          active-class="text-primary-600 font-bold border-b-2 border-primary-600"
          :class="[
            'transition-all text-center focus:outline-none font-bold',
            safeIsMobile
              ? 'shadow-md w-full p-4 rounded-lg bg-white text-slate-800'
              : 'text-slate-500 hover:text-primary-600 py-2',
            isAdmin && !safeIsMobile ? 'italic text-slate-700' : ''
          ]"
          @click="$emit('close')">
          {{ link.label }}
        </NuxtLink>
      </template>
    </template>

    <NuxtLink
      v-if="safeIsMobile && !isAdmin && !isRecruiter"
      to="/privacy-policy"
      class="transition-colors text-center text-primary-600 bg-slate-100 shadow-md w-full p-4 rounded-lg focus:text-slate-900 focus:outline-0 focus:bg-slate-300 font-bold mt-auto"
      @click="$emit('close')">
      Privacy Policy
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useCurrentUser } from 'vuefire';

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close']);

const { t } = useI18n();
const { isAdmin, isRecruiter, isRoleLoading } = useUserRole();

const user = useCurrentUser();
const isEmailVerified = ref<boolean>(false);

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});
const safeIsMobile = computed(() => isMounted.value && props.isMobile);

// --- 1. ADMIN GROUPS ---
const adminLinks = computed(() => [
  { to: '/', label: t('navbar.home'), mobileOnly: true },
  {
    label: t('navbar.group.data-api'),
    mobileOnly: false,
    children: [
      { to: '/admin/seed', label: t('navbar.seeder') },
      { to: '/admin/adzuna', label: t('navbar.adzuna-api') },
      { to: '/admin/jobs-cache', label: t('navbar.jobs-cache') },
      { to: '/admin/coding-index', label: t('navbar.coding-index') }
    ]
  },
  {
    label: t('navbar.group.platform-config'),
    mobileOnly: false,
    children: [
      { to: '/admin/banding', label: t('navbar.banding') },
      { to: '/admin/job-groups', label: t('navbar.job-groups') }
    ]
  },
  {
    label: t('navbar.group.analytics'),
    mobileOnly: false,
    children: [
      { to: '/admin/user-suggestions', label: t('navbar.user-suggestions') },
      { to: '/admin/search-logs', label: t('navbar.search-logs') }
    ]
  },
  {
    label: t('navbar.group.users'),
    mobileOnly: false,
    children: [{ to: '/admin/recruiters', label: t('navbar.recruiters') }]
  }
]);

// --- 2. RECRUITER LINKS ---
const recruiterLinks = computed(() => {
  const links = [
    { to: '/', label: t('navbar.home'), mobileOnly: true },
    { to: '/recruiter/dashboard', label: t('navbar.dashboard'), mobileOnly: false }
  ];

  // Only add the Territories link if they are fully verified
  if (isEmailVerified.value) {
    links.push({
      to: '/recruiter/territories',
      label: t('navbar.territories'),
      mobileOnly: false
    });
  }

  return links;
});

// --- 3. ORDINARY USER GROUPS ---
const navLinks = computed(() => [
  { to: '/', label: t('navbar.home'), mobileOnly: false },
  { to: '/about', label: t('navbar.about'), mobileOnly: false },
  {
    label: t('navbar.group.resources'),
    mobileOnly: false,
    children: [
      { to: '/how-it-works', label: t('navbar.how-it-works') },
      { to: '/data-sources', label: t('navbar.data-sources') },
      { to: '/frequently-asked-questions', label: t('navbar.faq-short') }
    ]
  },
  {
    label: t('navbar.group.partners'),
    mobileOnly: false,
    children: [{ to: '/recruiter/login', label: t('navbar.recruiters') }]
  }
]);

// --- 4. UNIFIED LOGIC ---
// This automatically picks the correct array based on the user's role and filters out mobile-only items on desktop
const activeLinks = computed(() => {
  if (isRoleLoading.value) return [];

  let sourceArray = navLinks.value;
  if (isAdmin.value) sourceArray = adminLinks.value;
  else if (isRecruiter.value) sourceArray = recruiterLinks.value;

  return sourceArray.filter((link) => !link.mobileOnly || safeIsMobile.value);
});

watchEffect(() => {
  isEmailVerified.value = user.value?.emailVerified || false;
});
</script>
