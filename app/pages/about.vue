<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <div class="px-4 mx-auto relative">
      <!-- Hero -->
      <div class="max-w-3xl mx-auto mb-8 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
          {{ $t('about.heading') }}
        </h1>
        <p class="mt-4 text-lg text-slate-500">
          {{
            $siteBrand === 'amiunderpaid' ? $t('about.body.bold') : $t('about.benchmark.body.bold')
          }}
        </p>
      </div>

      <!-- Mission: asymmetrical bento grid -->
      <div class="max-w-5xl gap-6 grid grid-cols-1 mt-8 mx-auto md:grid-cols-3">
        <div
          class="p-6 leading-relaxed shadow-sm md:col-span-2 md:p-8 rounded-3xl bg-primary-50 text-slate-600">
          <p class="leading-relaxed">
            {{
              $siteBrand === 'amiunderpaid'
                ? $t('about.body.intro')
                : $t('about.benchmark.body.intro')
            }}
          </p>

          <i18n-t
            :keypath="
              $siteBrand === 'amiunderpaid' ? 'about.body.middle' : 'about.benchmark.body.middle'
            "
            tag="p"
            class="mt-4 leading-relaxed"
            :values="{ app: $t('about.body.app-name') }">
            <template #app-name>
              <span class="font-bold text-primary-700">{{
                $siteBrand === 'amiunderpaid'
                  ? $t('about.body.app-name')
                  : $t('about.benchmark.body.app-name')
              }}</span>
            </template>
          </i18n-t>
        </div>

        <div class="p-6 text-white shadow-sm md:p-8 rounded-3xl bg-primary-700 md:col-span-1">
          <h2 class="text-xs font-bold tracking-widest uppercase text-primary-200">
            {{
              $siteBrand === 'amiunderpaid'
                ? $t('about.body.outro-title')
                : $t('about.benchmark.body.outro-title')
            }}
          </h2>
          <p class="mt-2 leading-relaxed">
            {{
              $siteBrand === 'amiunderpaid'
                ? $t('about.body.outro')
                : $t('about.benchmark.body.outro')
            }}
          </p>
        </div>
      </div>

      <!-- Highlights -->
      <section
        class="max-w-5xl gap-6 grid grid-cols-1 mt-6 mx-auto sm:grid-cols-3"
        aria-label="Why it matters">
        <div
          v-for="n in ['1', '2', '3']"
          :key="n"
          class="p-6 shadow-sm transition-shadow rounded-3xl bg-primary-50 hover:shadow-md">
          <div class="inline-block p-3 mb-4 rounded-2xl bg-white text-primary-600">
            <component :is="highlightIcon(n)" class="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 class="text-sm font-bold text-slate-900">
            {{
              $t(
                $siteBrand === 'amiunderpaid'
                  ? `about.highlights.${n}.title`
                  : `about.benchmark.highlights.${n}.title`
              )
            }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-slate-500">
            {{
              $t(
                $siteBrand === 'amiunderpaid'
                  ? `about.highlights.${n}.body`
                  : `about.benchmark.highlights.${n}.body`
              )
            }}
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Shield, Target, TrendingUp } from 'lucide-vue-next';
import type { Component } from 'vue';

const { $siteBrand } = useNuxtApp();
const { t } = useI18n();

const highlightIcons: Record<string, Component> = { '1': Target, '2': Shield, '3': TrendingUp };
const highlightIcon = (n: string): Component => highlightIcons[n] ?? Target;

useSeoMeta({
  title: $siteBrand === 'benchmarkmyrole' ? t('meta.about.benchmark.title') : t('meta.about.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.about.benchmark.description')
      : t('meta.about.description')
});
</script>
