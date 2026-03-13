<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-3xl px-4 mx-auto">
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
          {{ $t('how-it-works.heading') }}
        </h1>
        <p class="mt-4 text-lg text-slate-500">
          {{ $t('how-it-works.description') }}
        </p>
      </div>

      <!-- Steps Grid -->
      <div
        class="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        <!-- Step 1 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-slate-300 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <span class="font-bold text-white">1</span>
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">{{ $t('how-it-works.step.1.heading') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              {{ $t('how-it-works.step.1.body') }}
            </p>
          </div>
        </div>

        <!-- Step 2 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-indigo-600 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <Database class="w-5 h-5 text-white" />
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">{{ $t('how-it-works.step.2.heading') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              {{ $t('how-it-works.step.2.body') }}
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-emerald-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <Check class="w-5 h-5 text-white" />
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">{{ $t('how-it-works.step.3.heading') }}</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              {{ $t('how-it-works.step.3.body') }}
            </p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-16 text-center">
        <NuxtLink to="/">
          <AmIButton title="Go to salary search" size="lg">{{
            $siteBrand === 'amiunderpaid'
              ? $t('buttons.check-salary-now')
              : $t('buttons.benchmark.check-now')
          }}</AmIButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { Database, Check } from 'lucide-vue-next';

const { $siteBrand } = useNuxtApp();
const { t } = useI18n();
useSeoMeta({
  title:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.how-it-works.benchmark.title')
      : t('meta.how-it-works.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.how-it-works.benchmark.description')
      : t('meta.how-it-works.description')
});
</script>
