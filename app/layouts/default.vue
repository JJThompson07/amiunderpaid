<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
    <!-- Navbar -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-slate-200/50">
      <div class="flex flex-wrap items-center justify-between min-h-16 px-4 md:px-8 py-2">
        <!-- Logo -->
        <NuxtLink
          href="/"
          class="flex items-center gap-2 absolute"
          :title="$t('navbar.home')"
          @click="openMenu = false">
          <div
            class="flex items-center gap-1 text-xl font-bold tracking-tight text-primary-600 select-none rounded-xl bg-slate-100/50">
            <img :src="`/${$siteBrand}-logo.png`" class="h-12 w-12" :alt="$siteBrand" />
          </div>
        </NuxtLink>

        <!-- Nav -->
        <LazyAmINavBar v-if="!isMobile" />

        <!-- CTA -->
        <div class="flex flex-1 md:flex-0 items-center justify-end gap-4 absolute right-4">
          <AmIButton
            v-if="isAdmin"
            bg-colour="bg-transparent"
            text-colour="text-slate-600"
            animation-colour="bg-primary-400"
            title="Sign out"
            @click="handleLogout"
            >{{ $t('buttons.sign-out') }}</AmIButton
          >
          <button v-if="isMobile" class="p-1" @click="openMenu = !openMenu">
            <MenuIcon v-if="!openMenu" class="w-5 h-5" />
            <XIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <LazyAmINavBar v-if="openMenu && isMobile" :is-mobile="true" @close="openMenu = false" />

    <!-- Main Content -->
    <div class="flex-1">
      <slot />
    </div>

    <!-- Simple Footer -->
    <footer class="py-8 text-sm text-center bg-white border-t border-slate-200 text-slate-400">
      <p>
        &copy;
        {{
          $siteBrand === 'benchmarkmyrole'
            ? $t('common.footer.benchmark.copy')
            : $t('common.footer.copy')
        }}
      </p>
      <div class="mt-4 flex justify-center gap-6 items-center">
        <NuxtLink
          to="/privacy-policy"
          class="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          {{ $t('navbar.privacy-policy') }}
        </NuxtLink>
        <NuxtLink
          to="/frequently-asked-questions"
          class="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          {{ $t('navbar.faq') }}
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MenuIcon, XIcon } from 'lucide-vue-next';
const { isAdmin } = useUserRole();
const { locale } = useI18n();

const { $siteBrand } = useNuxtApp();
const route = useRoute();

const { isMobile: viewportIsMobile } = useViewport();

const i18nHead = useLocaleHead({
  seo: true // This single flag now handles SEO and direction attributes
});

const { logout } = useAdminAuth();

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
const isMobile = computed(() => isMounted.value && viewportIsMobile.value);

const openMenu = ref<boolean>(false);

const handleLogout = async () => {
  await logout();
  await navigateTo('/');
};

useHead({
  htmlAttrs: {
    lang: computed(() => i18nHead.value.htmlAttrs?.lang),
    dir: computed(() => i18nHead.value.htmlAttrs?.dir as 'ltr' | 'rtl' | 'auto' | undefined)
  },
  link: computed(() => {
    // 1. Extract the links Nuxt i18n generates, but filter out rogue canonicals
    let i18nLinks = (i18nHead.value.link || []).filter((l) => l.rel !== 'canonical');

    const cleanPath = route.path === '/' ? '' : route.path;

    // ✨ 2. Build a rock-solid SSR base URL (No more localhost leaks!)
    const getBaseUrl = () => {
      if (import.meta.dev) return 'http://localhost:3000';
      if ($siteBrand === 'amiunderpaid') {
        return locale.value === 'en-GB'
          ? 'https://www.amiunderpaid.co.uk'
          : 'https://www.amiunderpaid.com';
      }
      return 'https://www.benchmarkmyrole.com';
    };

    const baseUrl = getBaseUrl();

    // 3. Inject explicit multi-domain logic exclusively for Am I Underpaid
    if ($siteBrand === 'amiunderpaid') {
      // Remove i18n's generated alternates to prevent conflicting rules
      i18nLinks = i18nLinks.filter((l) => l.rel !== 'alternate');

      if (!import.meta.dev) {
        i18nLinks.push(
          {
            rel: 'alternate',
            hreflang: 'en-GB',
            href: `https://www.amiunderpaid.co.uk${cleanPath}`
          },
          { rel: 'alternate', hreflang: 'en-US', href: `https://www.amiunderpaid.com${cleanPath}` },
          {
            rel: 'alternate',
            hreflang: 'x-default',
            href: `https://www.amiunderpaid.com${cleanPath}`
          }
        );
      }
    }

    return [
      ...i18nLinks,
      // ✨ 4. Force the absolute, correct Canonical URL using our bulletproof baseUrl
      { rel: 'canonical', href: `${baseUrl}${cleanPath || '/'}` },
      { rel: 'icon', type: 'image/x-icon', href: `/${$siteBrand}-favicon.ico` }
    ];
  }),
  meta: computed(() => [...(i18nHead.value.meta || [])])
});
</script>

<style scoped></style>
