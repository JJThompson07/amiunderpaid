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

    <div class="relative max-w-xl mx-auto mb-12">
      <Search
        class="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-slate-400" />
      <input
        v-model="searchQuery"
        type="search"
        :placeholder="t('faq.search.placeholder')"
        class="w-full py-3 pl-12 pr-4 text-sm font-medium bg-white border border-slate-200 rounded-2xl shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400" />
    </div>

    <p v-if="filteredSections.length === 0" class="text-center text-slate-500">
      {{ t('faq.search.noResults') }}
    </p>

    <div class="flex flex-col gap-10">
      <!-- Dynamic Sections Loop -->
      <div v-for="section in filteredSections" :key="section.id">
        <h3 class="text-lg sm:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
          <span class="w-8 h-1 bg-primary-400 rounded-full" />
          {{ section.title }}
          <span class="flex-1 h-1 bg-primary-400 rounded-full" />
        </h3>
        <dl class="flex flex-col gap-4">
          <div
            v-for="item in section.items"
            :key="item.key"
            class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md cursor-pointer"
            @click="toggleItem(`${section.id}-${item.key}`)">
            <dt>
              <button
                class="flex w-full items-center justify-between p-4 md:p-5 text-left focus:outline-none hover:bg-slate-100 focus-visible:bg-slate-50 transition-colors duration-300"
                :class="{ 'bg-slate-100': openItems.has(`${section.id}-${item.key}`) }">
                <span class="text-base font-bold text-slate-800">
                  {{ item.question }}
                </span>
                <span class="flex items-center shrink-0">
                  <ChevronDown
                    class="w-5 h-5 text-slate-400 transition-transform duration-300"
                    :class="
                      openItems.has(`${section.id}-${item.key}`)
                        ? '-rotate-180 text-primary-500'
                        : ''
                    " />
                </span>
              </button>
            </dt>
            <!-- CSS Grid 0fr -> 1fr technique: transitions to the exact content height, no jump. -->
            <div
              class="grid transition-all duration-300 ease-in-out"
              :class="
                openItems.has(`${section.id}-${item.key}`)
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              ">
              <div class="overflow-hidden">
                <dd class="p-4 pt-0 md:p-5 md:pt-0">
                  <i18n-t
                    v-if="section.linkKeys.includes(item.key)"
                    :keypath="`faq.questions.section.${section.id}.${item.key}.answer`"
                    tag="p"
                    class="text-sm text-slate-600 leading-relaxed">
                    <template #link>
                      <NuxtLink
                        to="/mca-score"
                        class="font-bold text-primary-600 underline hover:text-primary-700">
                        {{ t(`faq.questions.section.${section.id}.${item.key}.linkText`) }}
                      </NuxtLink>
                    </template>
                  </i18n-t>
                  <p v-else class="text-sm text-slate-600 leading-relaxed">
                    {{ item.answer }}
                  </p>
                </dd>
              </div>
            </div>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ChevronDown, Search } from 'lucide-vue-next';
import faqJson from '../../../../i18n/locales/en-GB/faq.json';
import { filterFaqSections } from '../../../utils/faqFilter';
import type { FaqSection } from '../../../utils/faqFilter';

const { t } = useI18n();

// A section may include keys whose answer contains a {link} placeholder,
// rendered as a real NuxtLink instead of a plain resolved question/answer string.
type Section = FaqSection & { linkKeys: string[] };

// 1. Group the sections dynamically by looping over the JSON keys (general, tool, etc.)
const rawSections = computed(() => {
  // Cast the imported JSON's section map to a generic string-keyed record so we can
  // iterate over arbitrary section ids (general, tool, mca, ...) without strict indexing errors.
  const sectionData = (faqJson.questions?.section || {}) as Record<string, Record<string, unknown>>;
  return Object.keys(sectionData).map((sectionId) => {
    const sectionContent = sectionData[sectionId] || {};
    const keys = Object.keys(sectionContent).filter((k) => k !== 'title');
    return {
      id: sectionId, // 'general', 'tool'
      keys, // ['underpaid', 'fairPay', ...]
      linkKeys: keys.filter((key) => {
        const entry = sectionContent[key];
        return typeof entry === 'object' && entry !== null && 'linkText' in entry;
      })
    };
  });
});

// 2. Resolve the translated question/answer text for every item, once. Used for both
// rendering and search matching, and kept independent of the search query so the
// JSON-LD schema below always reflects the full, canonical FAQ list.
const resolvedSections = computed<Section[]>(() =>
  rawSections.value.map((section) => ({
    id: section.id,
    title: t(`faq.questions.section.${section.id}.title`),
    linkKeys: section.linkKeys,
    items: section.keys.map((key) => {
      const hasLink = section.linkKeys.includes(key);
      const answer = hasLink
        ? t(`faq.questions.section.${section.id}.${key}.answer`, {
            link: t(`faq.questions.section.${section.id}.${key}.linkText`)
          })
        : t(`faq.questions.section.${section.id}.${key}.answer`);
      return {
        key,
        question: t(`faq.questions.section.${section.id}.${key}.question`),
        answer
      };
    })
  }))
);

// 3. Client-side search: filters the resolved list by keyword match in question or answer.
// The query is debounced so filtering doesn't re-run on every keystroke.
const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const updateDebouncedSearchQuery = useDebounceFn((value: string) => {
  debouncedSearchQuery.value = value;
}, 300);
watch(searchQuery, (value) => updateDebouncedSearchQuery(value));

const filteredSections = computed<Section[]>(
  () => filterFaqSections(resolvedSections.value, debouncedSearchQuery.value) as Section[]
);

// Track which accordions are open. We'll open the first general question by default.
const openItems = ref<Set<string>>(new Set(['general-underpaid']));

const toggleItem = (id: string): void => {
  if (openItems.value.has(id)) {
    openItems.value.delete(id);
  } else {
    openItems.value.add(id);
  }
};

// ---------------------------------------------------------
// SEO: Automatically generate standard FAQ Schema
// ---------------------------------------------------------
type FaqSchemaQuestion = {
  '@type': 'Question';
  name: string;
  acceptedAnswer: {
    '@type': 'Answer';
    text: string;
  };
};

const faqSchema = computed(() => {
  const mainEntity: FaqSchemaQuestion[] = [];

  // Loop through the full, unfiltered set of sections and items so the schema always
  // reflects every FAQ on the page, regardless of the current search query.
  resolvedSections.value.forEach((section) => {
    section.items.forEach((item) => {
      mainEntity.push({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
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
