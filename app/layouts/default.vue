<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
    <!-- Navbar -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-slate-200/50">
      <div class="flex flex-wrap items-center justify-between min-h-16 px-4 md:px-8 py-2">
        <!-- Logo -->
        <NuxtLink href="/" class="flex items-center gap-2 absolute" @click="openMenu = false">
          <div
            class="flex items-center gap-1 text-xl font-bold tracking-tight text-primary-600 select-none">
            <div class="logo h-7 w-7" aria-label="Am I" />
            <span class="text-slate-900">{{ $t('common.underpaid') }}</span>
          </div>
        </NuxtLink>

        <!-- Nav -->
        <LazyAmINavBar v-if="!isMobile" :is-admin="isAdmin" />

        <!-- CTA -->
        <div class="flex flex-1 md:flex-0 items-center justify-end gap-4 absolute right-4">
          <AmIButton
            v-if="user"
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

    <LazyAmINavBar
      v-if="openMenu && isMobile"
      :is-admin="isAdmin"
      :is-mobile="true"
      @close="openMenu = false" />

    <!-- Main Content -->
    <div class="flex-1">
      <slot />
    </div>

    <LazyModalGeneric v-model="showFaq" :title="$t('faq.title')" @close="showFaq = false">
      <SectionFaq />
    </LazyModalGeneric>

    <!-- Simple Footer -->
    <footer class="py-8 text-sm text-center bg-white border-t border-slate-200 text-slate-400">
      <p>&copy; {{ $t('common.footer.copy') }}</p>
      <div class="mt-4 flex justify-center gap-6 items-center">
        <NuxtLink
          to="/privacy-policy"
          class="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          {{ $t('navbar.privacy-policy') }}
        </NuxtLink>
        <span
          role="button"
          :title="$t('faq.title')"
          class="text-xs text-slate-400 hover:text-slate-600 transition-colors select-none cursor-pointer"
          @click="
            showFaq = true;
            console.log('FAQ opened', showFaq);
          "
          >{{ $t('faq.title') }}</span
        >
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useCurrentUser } from 'vuefire';
import { ref, onMounted, computed } from 'vue';
import { MenuIcon, XIcon } from 'lucide-vue-next';

const { isMobile: viewportIsMobile } = useViewport();

const i18nHead = useLocaleHead({
  seo: true // This single flag now handles SEO and direction attributes
});

const { t } = useI18n();

const { logout } = useAdminAuth();

const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});
const isMobile = computed(() => isMounted.value && viewportIsMobile.value);

const openMenu = ref<boolean>(false);
const showFaq = ref<boolean>(false);

const user = useCurrentUser();

const isAdmin = computed(() => Boolean(user.value?.email));

const handleLogout = async () => {
  await logout();
  await navigateTo('/');
};

// Define the keys matching our JSON structure
const faqGeneralKeys = ['underpaid', 'averageWage', 'expect'];
const faqToolKeys = ['jobTitle', 'cantFindJobTitle', 'salaryScare', 'gdpr'];

// Generate JSON-LD for rich snippets in Google Search Results
// Wrapped in computed() so the Schema translates dynamically if the user switches languages
const faqSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqGeneralKeys
    .map((key) => ({
      '@type': 'Question',
      name: t(`faq.questions.section.general.${key}.question`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`faq.questions.section.general.${key}.answer`)
      }
    }))
    .concat(
      faqToolKeys.map((key) => ({
        '@type': 'Question',
        name: t(`faq.questions.section.tool.${key}.question`),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t(`faq.questions.section.tool.${key}.answer`)
        }
      }))
    )
}));

useHead({
  htmlAttrs: {
    lang: computed(() => i18nHead.value.htmlAttrs?.lang),
    // Use type assertion to match the expected 'ltr' | 'rtl' | 'auto' type
    dir: computed(() => i18nHead.value.htmlAttrs?.dir as 'ltr' | 'rtl' | 'auto' | undefined)
  },
  link: computed(() => [...(i18nHead.value.link || [])]),
  meta: computed(() => [...(i18nHead.value.meta || [])]),
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(faqSchema.value))
    }
  ]
});
</script>

<style>
.logo {
  background: url('../assets/img/logo.png') no-repeat center center;
  background-size: cover;
}
</style>
