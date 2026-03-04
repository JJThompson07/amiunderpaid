<template>
  <section class="max-w-4xl mx-auto mt-20 px-4 pb-20 border-t border-slate-200 pt-16 select-none">
    <div class="grid md:grid-cols-2 gap-12 text-slate-600">
      <div>
        <h3 class="text-xl font-bold text-secondary-900 mb-4">Why check your market rate?</h3>
        <p class="leading-relaxed">
          <i18n-t
            keypath="landing.why.body"
            tag="p"
            class="leading-relaxed"
            :values="{ year: new Date().getFullYear() }">
            <template #benchmarks>
              <strong>{{ $t('landing.why.benchmarks_bold') }}</strong>
            </template>
          </i18n-t>
        </p>
      </div>
      <div>
        <h3 class="text-xl font-bold text-secondary-900 mb-4">
          {{ $t('landing.data.heading') }}
        </h3>
        <p class="leading-relaxed">
          <i18n-t keypath="landing.data.body" tag="p" class="leading-relaxed">
            <template #comparison>
              <strong>{{ $t('landing.data.comparison_bold') }}</strong>
            </template>
            <template #bureau>
              <strong>{{
                isUSA ? $t('landing.data.bureau.usa') : $t('landing.data.bureau.uk')
              }}</strong>
            </template>
          </i18n-t>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps({
  isUSA: {
    type: Boolean,
    required: true
  }
});
</script>

<style scoped></style>
