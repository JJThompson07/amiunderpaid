<template>
  <div
    class="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
    <!-- Header: Logo & Title -->
    <div class="flex items-center gap-4 p-2 md:p-4" :style="brandStyle">
      <img
        v-if="previewLogo"
        :src="previewLogo"
        alt="Agency Logo"
        class="object-cover w-14 h-14 rounded-2xl" />
      <div
        v-else
        class="w-14 h-14 rounded-2xl border border-black/5 overflow-hidden shrink-0 bg-white flex items-center justify-center shadow-sm">
        <BriefcaseBusiness class="w-6 h-6 text-slate-300" />
      </div>
      <div class="flex-1">
        <h3
          class="text-lg md:text-xl font-black leading-tight"
          :style="{ color: brandTextColour || '#ffffff' }">
          {{ displayTitle }}
        </h3>
      </div>
    </div>

    <div class="p-2 md:p-4 flex flex-col gap-6">
      <!-- Dynamic Content -->
      <div class="">
        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
          {{ displayContent }}
        </p>
      </div>

      <!-- Lead Capture Form -->
      <form class="flex flex-col gap-2" @submit.prevent>
        <AmIInputGeneric
          v-model="name"
          :label="$t('common.name', 'Full Name')"
          label-size="text-2xs"
          placeholder="e.g. Jane Doe" />

        <AmIInputGeneric
          v-model="email"
          type="email"
          :label="$t('common.email', 'Email Address')"
          label-size="text-2xs"
          placeholder="e.g. jane@example.com" />

        <div class="pt-2">
          <button
            class="w-full py-3 px-4 rounded-xl font-bold transition-all shadow-sm hover:opacity-90"
            :style="brandStyle">
            {{ $t('common.submit', 'Submit') }}
          </button>
          <button
            v-if="showClose"
            type="button"
            class="w-full py-3 px-4 mt-2 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            @click="$emit('close')">
            {{ $t('common.close', 'Close') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseBusiness } from 'lucide-vue-next';
import type { PropType } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  logoFile: { type: Object as PropType<object | null>, default: null },
  brandBgColour: { type: String, default: '' },
  brandTextColour: { type: String, default: '' },
  location: { type: String, default: 'their location' },
  agencyName: { type: String, default: '' },
  buttonText: { type: String, default: '' },
  showClose: { type: Boolean, default: false }
});

defineEmits(['close']);

const name = ref('');
const email = ref('');
const { t } = useI18n();
const route = useRoute();

// Dynamically create a temporary local URL for the un-uploaded image file!
const previewLogo = computed(() => {
  if (import.meta.client && props.logoFile instanceof File) {
    return URL.createObjectURL(props.logoFile);
  }
  return props.logoUrl || '';
});

const replaceWildcards = (text: string) => {
  if (!text) return '';
  let incentive = 'roles';

  if (route.path.includes('/benchmark')) incentive = 'candidates';
  else if (route.path.includes('/recruiter')) incentive = 'roles/candidates'; // Preview mode

  return text
    .replace(/{location}/gi, props.location || 'their location')
    .replace(/{agency}/gi, props.agencyName || 'our agency')
    .replace(/{incentive}/gi, incentive);
};

const displayTitle = computed(() => {
  const base =
    props.title || t('recruiter.leads.preview.default-title', 'Talk to our hiring experts');
  return replaceWildcards(base);
});

const displayContent = computed(() => {
  const base =
    props.content ||
    t(
      'recruiter.leads.preview.default-content',
      'We would love to hear from you. Please leave your details below and one of our experts will be in touch.'
    );
  return replaceWildcards(base);
});

const brandStyle = computed(() => {
  return {
    backgroundColor: props.brandBgColour || '#4f46e5',
    color: props.brandTextColour || '#ffffff'
  };
});
</script>
