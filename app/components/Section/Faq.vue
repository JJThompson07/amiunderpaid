<template>
  <section class="max-w-4xl mx-auto sm:p-4 lg:p-6">
    <div class="text-center mb-10">
      <p class="text-gray-500 dark:text-gray-400">
        {{ t('faq.subtitle') }}
      </p>
    </div>

    <div class="flex flex-col gap-4 overflow-scroll">
      <h4 class="text-sm font-bold uppercase text-secondary-600">
        {{ t('faq.questions.section.general.title') }}
      </h4>
      <div
        v-for="key in faqGeneralKeys"
        :key="key"
        class="bg-secondary-900 rounded-2xl shadow-sm p-2 sm:p-4 hover:bg-secondary-800 transition-colors duration-300 ease-in-out">
        <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">
          {{ t(`faq.questions.section.general.${key}.question`) }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ t(`faq.questions.section.general.${key}.answer`) }}
        </p>
      </div>
      <h4 class="text-sm font-bold uppercase text-secondary-600">
        {{ t('faq.questions.section.tool.title') }}
      </h4>
      <div
        v-for="key in faqToolKeys"
        :key="key"
        class="bg-secondary-900 rounded-2xl shadow-sm p-2 sm:p-4 hover:bg-secondary-800 transition-colors duration-300 ease-in-out">
        <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">
          {{ t(`faq.questions.section.tool.${key}.question`) }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {{ t(`faq.questions.section.tool.${key}.answer`) }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Define the keys matching our JSON structure
const faqGeneralKeys = ['underpaid', 'averageWage', 'expect'];
const faqToolKeys = ['jobTitle', 'cantFindJobTitle', 'salaryScare', 'gdpr'];
</script>
