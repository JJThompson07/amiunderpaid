<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <SectionSharedBackdrop bg-from="from-slate-900/15" />
    <div class="max-w-2xl px-4 mx-auto relative">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">{{ $t('about.heading') }}</h1>
      </div>

      <article
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
      </article>

      <section class="grid grid-cols-1 gap-4 mt-8 sm:grid-cols-3" aria-label="Why it matters">
        <div
          v-for="n in ['1', '2', '3']"
          :key="n"
          class="p-6 bg-white border shadow-sm rounded-2xl border-slate-200">
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
