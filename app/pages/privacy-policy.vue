<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-3xl px-4 mx-auto">
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">
          {{ $t('privacy-policy.heading') }}
        </h1>
        <p class="mt-4 text-lg text-slate-500">
          {{
            $t('privacy-policy.updated', {
              date: new Date(2026, 1).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long'
              })
            })
          }}
        </p>
      </div>

      <div
        class="p-8 space-y-8 bg-white border shadow-xl rounded-3xl border-slate-200 text-slate-600 leading-relaxed">
        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">
            {{ $t('privacy-policy.collection.heading') }}
          </h2>
          <p>
            {{
              $t('privacy-policy.collection.body.1', {
                name:
                  $siteBrand === 'benchmarkmyrole'
                    ? $t('privacy-policy.benchmark.name')
                    : $t('privacy-policy.name')
              })
            }}
          </p>
          <p class="mt-2">
            {{ $t('privacy-policy.collection.body.2') }}
          </p>
          <p class="mt-2">
            {{ $t('privacy-policy.collection.body.3') }}
          </p>
        </section>

        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">
            {{ $t('privacy-policy.sources.heading') }}
          </h2>
          <p>
            {{ $t('privacy-policy.sources.body.desc') }}
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>
              <i18n-t keypath="privacy-policy.sources.body.list.1" tag="p" class="leading-relaxed">
                <template #ons>
                  <strong>{{ $t('privacy-policy.sources.body.list.ons') }}</strong>
                </template>
              </i18n-t>
            </li>
            <li>
              <i18n-t keypath="privacy-policy.sources.body.list.2" tag="p" class="leading-relaxed">
                <template #bls>
                  <strong>{{ $t('privacy-policy.sources.body.list.bls') }}</strong>
                </template>
              </i18n-t>
            </li>
            <li>
              <div class="flex gap-1 items-center">
                <i18n-t
                  keypath="privacy-policy.sources.body.list.3"
                  tag="p"
                  class="leading-relaxed">
                  <template #adzuna>
                    <strong>{{ $t('privacy-policy.sources.body.list.adzuna') }}</strong>
                  </template>
                </i18n-t>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-bold text-slate-900 mb-4">
            {{ $t('privacy-policy.affiliate.heading') }}
          </h2>
          <p>
            {{ $t('privacy-policy.affiliate.body.1') }}
          </p>
          <p class="mt-2">
            {{ $t('privacy-policy.affiliate.body.2') }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $siteBrand } = useNuxtApp();
const { locale } = useI18n();
useSeoMeta({
  title: 'Privacy Policy | Am I Underpaid?',
  description: 'Privacy policy, data sources, and affiliate disclosure for Am I Underpaid?'
});
</script>
