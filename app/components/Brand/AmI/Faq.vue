<template>
  <section class="w-full max-w-4xl mx-auto px-4 sm:px-6 mt-6 pt-24 pb-8 relative">
    <div class="text-center mb-12">
      <!-- Added a title hook for better context -->
      <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {{ t('faq.title') }}
      </h1>
      <p class="mt-4 text-lg text-slate-700 max-w-2xl mx-auto">
        {{ t('faq.subtitle', { name: $t('faq.name') }) }}
      </p>
    </div>

    <div class="flex flex-col gap-10">
      <!-- Dynamic Sections Loop -->
      <div v-for="section in sections" :key="section.id">
        <h3 class="text-lg sm:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
          <span class="w-8 h-1 bg-primary-400 rounded-full"></span>
          {{ t(`faq.questions.section.${section.id}.title`) }}
          <span class="flex-1 h-1 bg-primary-400 rounded-full"></span>
        </h3>
        <dl class="flex flex-col gap-4">
          <div
            v-for="key in section.keys"
            :key="key"
            class="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out hover:shadow-md cursor-pointer"
            @click="toggleItem(`${section.id}-${key}`)">
            <dt>
              <button
                class="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none hover:bg-slate-100 focus-visible:bg-slate-50 transition-all duration-500 ease-in-out"
                :class="{ 'bg-slate-100': openItems.has(`${section.id}-${key}`) }">
                <span class="text-base font-bold text-slate-800">
                  {{ t(`faq.questions.section.${section.id}.${key}.question`) }}
                </span>
                <span class="ml-6 flex items-center shrink-0">
                  <ChevronDown
                    class="w-5 h-5 text-slate-400 transition-transform duration-300"
                    :class="
                      openItems.has(`${section.id}-${key}`) ? '-rotate-180 text-primary-500' : ''
                    " />
                </span>
              </button>
            </dt>
            <transition
              enter-active-class="transition-all duration-300 ease-in-out overflow-hidden"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-200 ease-in-out overflow-hidden"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0">
              <dd v-show="openItems.has(`${section.id}-${key}`)" class="px-6 pb-5 pt-1">
                <p class="text-sm text-slate-600 leading-relaxed">
                  {{ t(`faq.questions.section.${section.id}.${key}.answer`) }}
                </p>
              </dd>
            </transition>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDown } from 'lucide-vue-next';
import faqJson from '../../../../i18n/locales/en-GB/faq.json';

const { t } = useI18n();

// 1. Group the sections dynamically by looping over the JSON keys (general, tool, etc.)
const sections = computed(() => {
  const sectionData = faqJson.questions?.section || {};
  return Object.keys(sectionData).map((sectionId) => {
    // Cast to any to avoid strict indexing errors on the imported JSON
    const sectionContent = (sectionData as any)[sectionId] || {};
    return {
      id: sectionId, // 'general', 'tool'
      keys: Object.keys(sectionContent).filter((k) => k !== 'title') // ['underpaid', 'fairPay', ...]
    };
  });
});

// Track which accordions are open. We'll open the first general question by default.
const openItems = ref<Set<string>>(new Set(['general-underpaid']));

const toggleItem = (id: string) => {
  if (openItems.value.has(id)) {
    openItems.value.delete(id);
  } else {
    openItems.value.add(id);
  }
};

// ---------------------------------------------------------
// SEO: Automatically generate standard FAQ Schema
// ---------------------------------------------------------
const faqSchema = computed(() => {
  const mainEntity: any[] = [];

  // Loop through all sections and their respective keys cleanly
  sections.value.forEach((section) => {
    section.keys.forEach((key) => {
      mainEntity.push({
        '@type': 'Question',
        name: t(`faq.questions.section.${section.id}.${key}.question`),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t(`faq.questions.section.${section.id}.${key}.answer`)
        }
      });
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity
  };
});

// Inject the JSON-LD schema into the <head> of whatever page uses this component
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(faqSchema.value))
    }
  ]
});
</script>
