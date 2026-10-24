<template>
  <ToastGeneric
    :model-value="modelValue"
    :duration="0"
    direction="right"
    :bg-classes="theme.wrapper"
    z-index-class="z-[90]">
    <div role="status" aria-live="polite" class="flex items-start gap-3">
      <div
        :class="[
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center border',
          theme.iconBg
        ]">
        <component :is="theme.icon" :class="['w-4 h-4', theme.iconColour]" />
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-3">
        <div>
          <span
            :class="[
              'inline-block px-1.5 py-0.5 rounded text-2xs font-bold uppercase',
              theme.badge
            ]">
            {{ $t('toast.affiliate.sponsored') }}
          </span>
          <h3 class="mt-1 text-sm font-bold text-slate-900">{{ $t(copyKeys.title) }}</h3>
          <p class="mt-0.5 text-sm text-slate-600">{{ $t(copyKeys.message) }}</p>
        </div>

        <a
          :href="url"
          target="_blank"
          rel="sponsored"
          :class="[
            'block w-full px-3 py-2 text-center text-sm font-bold text-white rounded-lg transition-colors shadow-md',
            theme.cta
          ]"
          @click="$emit('cta')"
          @auxclick.middle="$emit('cta')"
          >{{ $t(copyKeys.cta) }}</a
        >
      </div>

      <button
        type="button"
        class="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        @click="$emit('dismiss')">
        <span class="sr-only">{{ $t('common.close') }}</span>
        <X class="w-5 h-5" />
      </button>
    </div>
  </ToastGeneric>
</template>

<script setup lang="ts">
import { Binoculars, FileText, TrendingUp, X } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { AffiliatePartnerSlug } from '~~/shared/utils/affiliates';
import { computed } from 'vue';

type ToastTheme = {
  wrapper: string;
  iconBg: string;
  iconColour: string;
  badge: string;
  cta: string;
  icon: Component;
};

// ** props **
const props = defineProps<{
  modelValue: boolean;
  partner: AffiliatePartnerSlug;
  url: string;
  copyKeys: { title: string; message: string; cta: string };
}>();

// ** emits **
defineEmits<{
  (e: 'cta' | 'dismiss'): void;
}>();

// presentation stays here rather than in the server-importable offer registry
const THEMES: Record<AffiliatePartnerSlug, ToastTheme> = {
  'salary-negotiator': {
    wrapper: 'bg-white border-salary-negotiator-200',
    iconBg: 'bg-salary-negotiator-100 border-salary-negotiator-200/50',
    iconColour: 'text-salary-negotiator-600',
    badge: 'bg-salary-negotiator-100 text-salary-negotiator-600',
    cta: 'bg-salary-negotiator-500 hover:bg-salary-negotiator-700',
    icon: TrendingUp
  },
  'purple-cv': {
    wrapper: 'bg-white border-purple-cv-200',
    iconBg: 'bg-purple-cv-100 border-purple-cv-200/50',
    iconColour: 'text-purple-cv-600',
    badge: 'bg-purple-cv-100 text-purple-cv-600',
    cta: 'bg-purple-cv-900 hover:bg-purple-cv-700',
    icon: FileText
  },
  'cv-library': {
    wrapper: 'bg-white border-cv-library-200',
    iconBg: 'bg-cv-library-100 border-cv-library-200/50',
    iconColour: 'text-cv-library-700',
    badge: 'bg-cv-library-100 text-cv-library-700',
    cta: 'bg-cv-library-700 hover:bg-cv-library-500',
    icon: Binoculars
  }
};

// ** computed properties **
const theme = computed(() => THEMES[props.partner]);
</script>
