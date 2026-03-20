<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <div class="max-w-2xl px-4 mx-auto relative">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">{{ $t('about.heading') }}</h1>
      </div>

      <div
        class="p-8 space-y-6 leading-relaxed bg-white border shadow-xl md:p-12 rounded-3xl border-slate-200 text-slate-600">
        <p>
          <span class="font-bold text-slate-900">{{
            $siteBrand === 'amiunderpaid' ? $t('about.body.bold') : $t('about.benchmark.body.bold')
          }}</span>
          {{
            $siteBrand === 'amiunderpaid'
              ? $t('about.body.intro')
              : $t('about.benchmark.body.intro')
          }}
        </p>

        <p>
          <i18n-t
            :keypath="
              $siteBrand === 'amiunderpaid' ? 'about.body.middle' : 'about.benchmark.body.middle'
            "
            tag="p"
            class="leading-relaxed"
            :values="{ app: $t('about.body.app-name') }">
            <template #app-name>
              <span class="font-bold text-indigo-600">{{
                $siteBrand === 'amiunderpaid'
                  ? $t('about.body.app-name')
                  : $t('about.benchmark.body.app-name')
              }}</span>
            </template>
          </i18n-t>
        </p>

        <p>
          {{
            $siteBrand === 'amiunderpaid'
              ? $t('about.body.outro')
              : $t('about.benchmark.body.outro')
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
const { t } = useI18n();
useSeoMeta({
  title: $siteBrand === 'benchmarkmyrole' ? t('meta.about.benchmark.title') : t('meta.about.title'),
  description:
    $siteBrand === 'benchmarkmyrole'
      ? t('meta.about.benchmark.description')
      : t('meta.about.description')
});
</script>
