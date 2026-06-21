<template>
  <div
    class="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col relative overflow-hidden">
    <div class="flex items-center gap-4 p-4 md:p-6" :style="brandStyle">
      <img
        v-if="previewLogo"
        :src="previewLogo"
        alt="Agency Logo"
        class="object-cover w-14 h-14 rounded-2xl bg-white" />
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

    <div class="p-4 md:p-6 flex flex-col gap-6">
      <div
        v-if="isSuccess"
        class="flex flex-col items-center justify-center text-center py-6 animate-in zoom-in duration-300">
        <div
          class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h4 class="text-lg font-bold text-slate-900 mb-2">
          {{ $t('recruiter.leads.preview.success-title', 'Details Sent!') }}
        </h4>
        <p class="text-sm text-slate-500">
          The team at <strong>{{ agencyName || 'our partner agency' }}</strong> has received your
          information and will be in touch shortly.
        </p>
        <button
          v-if="showClose"
          class="mt-6 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          @click="$emit('close')">
          {{ $t('common.close', 'Close Window') }}
        </button>
      </div>

      <template v-else>
        <div>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
            {{ displayContent }}
          </p>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submitLead">
          <AmIInputGeneric
            v-model="name"
            :label="$t('common.name', 'Full Name')"
            label-size="text-2xs"
            placeholder="e.g. Jane Doe"
            required />

          <AmIInputGeneric
            v-model="email"
            type="email"
            :label="$t('common.email', 'Email Address')"
            label-size="text-2xs"
            placeholder="e.g. jane@example.com"
            required />

          <div
            v-if="error"
            class="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
            {{ error }}
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading || !name || !email"
              class="w-full py-3 px-4 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :style="brandStyle">
              <span
                v-if="isLoading"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{
                isLoading ? $t('common.saved.saving', 'Sending...') : $t('common.submit', 'Submit')
              }}</span>
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
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { BriefcaseBusiness } from 'lucide-vue-next';
import type { PropType } from 'vue';

const props = defineProps({
  // 👇 Added these two crucial props to pass to the backend
  recruiterId: { type: String, default: '' },
  searchedRole: { type: String, default: '' },
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
const isLoading = ref(false);
const isSuccess = ref(false);
const error = ref('');
const { t } = useI18n();
const route = useRoute();

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
  else if (route.path.includes('/recruiter')) incentive = 'roles/candidates';

  return text
    .replace(/{location}/gi, props.location || 'their location')
    .replace(/{agency}/gi, props.agencyName || 'our agency')
    .replace(/{incentive}/gi, incentive);
};

const displayTitle = computed(() =>
  replaceWildcards(
    props.title || t('recruiter.leads.preview.default-title', 'Talk to our hiring experts')
  )
);
const displayContent = computed(() =>
  replaceWildcards(
    props.content ||
      t(
        'recruiter.leads.preview.default-content',
        'We would love to hear from you. Please leave your details below and one of our experts will be in touch.'
      )
  )
);

const brandStyle = computed(() => ({
  backgroundColor: props.brandBgColour || '#4f46e5',
  color: props.brandTextColour || '#ffffff'
}));

// THE SUBMISSION LOGIC
const submitLead = async () => {
  if (!name.value || !email.value || !props.recruiterId) return;

  isLoading.value = true;
  error.value = '';

  try {
    await $fetch('/api/user/leads/submit', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        recruiterId: props.recruiterId,
        searchedRole: props.searchedRole,
        location: props.location
      }
    });

    isSuccess.value = true;
  } catch (err) {
    error.value = 'Something went wrong. Please try again.';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};
</script>
