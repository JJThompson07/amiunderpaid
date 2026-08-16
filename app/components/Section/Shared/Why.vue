<template>
  <section class="max-w-5xl mx-auto mt-24 px-4 pb-20 select-none">
    <div class="grid md:grid-cols-2 gap-8 text-slate-600">
      <div class="bg-white/50 backdrop-blur-xl border border-slate-200/60 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300">
        <h3 class="text-2xl font-black tracking-tight text-secondary-950 mb-4">Why check your market rate?</h3>
        <i18n-t
          keypath="landing.why.body"
          tag="p"
          class="leading-relaxed text-slate-600"
          :values="{ year: new Date().getFullYear() }">
          <template #benchmarks>
            <strong class="text-secondary-900">{{ $t('landing.why.benchmarks_bold') }}</strong>
          </template>
        </i18n-t>
      </div>
      <div class="bg-white/50 backdrop-blur-xl border border-slate-200/60 p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-300">
        <h3 class="text-2xl font-black tracking-tight text-secondary-950 mb-4">
          {{ $t('landing.data.heading') }}
        </h3>
        <i18n-t keypath="landing.data.body" tag="p" class="leading-relaxed text-slate-600">
          <template #comparison>
            <strong class="text-secondary-900">{{ $t('landing.data.comparison_bold') }}</strong>
          </template>
          <template #bureau>
            <strong class="text-secondary-900">{{
              isUSA ? $t('landing.data.bureau.usa') : $t('landing.data.bureau.uk')
            }}</strong>
          </template>
        </i18n-t>
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
