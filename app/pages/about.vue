<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-2xl px-4 mx-auto">
      <div class="mb-10 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">{{ $t('about.heading') }}</h1>
      </div>

      <div
        class="p-8 space-y-6 leading-relaxed bg-white border shadow-xl md:p-12 rounded-3xl border-slate-200 text-slate-600">
        <p>
          <span class="font-bold text-slate-900">{{ $t('about.body.bold') }}</span>
          {{ $t('about.body.intro') }}
        </p>

        <p>
          <ClientOnly>
            <i18n-t
              keypath="about.body.middle"
              tag="p"
              class="leading-relaxed"
              :values="{ app: $t('about.body.app-name') }">
              <template #app-name>
                <span class="font-bold text-indigo-600">{{ $t('about.body.app-name') }}</span>
              </template>
            </i18n-t>
          </ClientOnly>
        </p>

        <p>
          {{ $t('about.body.outro') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>
