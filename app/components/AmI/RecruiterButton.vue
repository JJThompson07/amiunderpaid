<template>
  <div
    class="h-full flex flex-col gap-4 p-4 md:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div class="flex items-center gap-3">
      <img
        v-if="card.logoUrl"
        :src="card.logoUrl"
        class="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0" />
      <div
        v-else
        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        :style="{
          backgroundColor: `${card.brandBgColour || '#4f46e5'}1a`,
          color: card.brandBgColour || '#4f46e5'
        }">
        <BriefcaseBusiness class="w-5 h-5" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-slate-900 text-sm truncate">
          {{ card.agencyName || 'Hiring Expert' }}
        </h4>
        <p class="text-xs text-slate-500 truncate">{{ displayTitle }}</p>
      </div>
    </div>
    <button
      class="mt-auto w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 shadow-sm"
      :style="{
        backgroundColor: card.brandBgColour || '#4f46e5',
        color: card.brandTextColour || '#ffffff'
      }"
      @click="$emit('click', card)">
      {{ displayButtonText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseBusiness } from 'lucide-vue-next';
import { computed, type PropType } from 'vue';
import type { RecruiterCard } from '~~/shared/utils/types';

const props = defineProps({
  card: { type: Object as PropType<RecruiterCard>, required: true },
  location: { type: String, default: 'their location' }
});

const route = useRoute();

const replaceWildcards = (text: string): string => {
  if (!text) {
    return '';
  }
  const incentive = route.path.includes('/benchmark') ? 'candidates' : 'roles';

  return text
    .replace(/{location}/gi, props.location)
    .replace(/{agency}/gi, props.card.agencyName || 'our agency')
    .replace(/{incentive}/gi, incentive);
};

const displayTitle = computed(() => replaceWildcards(props.card.title || 'Get in touch'));
const displayButtonText = computed(() => replaceWildcards(props.card.buttonText || 'Contact Us'));

defineEmits<{
  (e: 'click', card: RecruiterCard): void;
}>();
</script>
