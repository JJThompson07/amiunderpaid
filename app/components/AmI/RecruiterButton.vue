<template>
  <div class="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
    <div
      class="flex flex-col gap-4 p-5"
      :style="{
        backgroundColor: `${card.brandBgColour || '#4f46e5'}22`
      }">
      <div class="flex items-center gap-4">
        <img
          v-if="card.logoUrl"
          :src="card.logoUrl"
          class="w-12 h-12 rounded-xl object-cover border border-slate-100"
          :style="{
            backgroundColor: card.brandBgColour || '#4f46e5',
            color: card.brandTextColour || '#ffffff'
          }" />
        <div
          v-else
          class="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          <BriefcaseBusiness class="w-6 h-6 text-slate-300" />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-black text-slate-900 text-sm truncate">
            {{ card.agencyName || 'Hiring Expert' }}
          </h4>
          <p class="text-xs text-slate-600 truncate">{{ displayTitle }}</p>
        </div>
      </div>
      <button
        class="w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 shadow-sm"
        :style="{
          backgroundColor: card.brandBgColour || '#4f46e5',
          color: card.brandTextColour || '#ffffff'
        }"
        @click="$emit('click', card)">
        {{ displayButtonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseBusiness } from 'lucide-vue-next';
import { computed, type PropType } from 'vue';

const props = defineProps({
  card: { type: Object as PropType<any>, required: true },
  location: { type: String, default: 'their location' }
});

const route = useRoute();

const replaceWildcards = (text: string) => {
  if (!text) return '';
  const incentive = route.path.includes('/benchmark') ? 'candidates' : 'roles';

  return text
    .replace(/{location}/gi, props.location)
    .replace(/{agency}/gi, props.card.agencyName || 'our agency')
    .replace(/{incentive}/gi, incentive);
};

const displayTitle = computed(() => replaceWildcards(props.card.title || 'Get in touch'));
const displayButtonText = computed(() => replaceWildcards(props.card.buttonText || 'Contact Us'));

defineEmits(['click']);
</script>
