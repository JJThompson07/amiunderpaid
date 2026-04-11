<template>
  <div
    class="border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col hover:shadow-md transition-all relative overflow-hidden group h-full">
    <header class="flex items-center justify-between p-3 px-4" :class="headerBg">
      <div class="flex items-center gap-2 overflow-hidden">
        <MapPin class="w-4 h-4 text-white/80 shrink-0" />
        <span class="font-bold text-white text-sm uppercase tracking-wider truncate">
          {{ locationName }}
        </span>
      </div>

      <div
        class="bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm shrink-0 border border-white/10">
        Band {{ territoryBand }}
      </div>
    </header>

    <div class="flex-1 flex flex-col p-3">
      <div class="flex items-start justify-between gap-3">
        <h3 class="font-black text-slate-800 text-xl leading-tight truncate" :title="categoryName">
          {{ categoryName }}
        </h3>

        <div
          v-if="territory.isBasic"
          class="bg-secondary-50 text-secondary-700 text-xs font-bold px-2.5 py-1 rounded-md border border-secondary-200 flex items-center gap-1.5 shrink-0 shadow-xs">
          <CheckSquareIcon class="w-3.5 h-3.5 text-secondary-500" /> Basic
        </div>
      </div>

      <div
        v-if="territory.exclusiveMonths && territory.exclusiveMonths.length > 0"
        class="flex flex-col gap-3 mt-3">
        <div class="flex items-center gap-2">
          <div
            class="bg-primary-500 text-white text-xs font-black px-2 py-0.5 rounded-md shadow-xs">
            {{ territory.exclusiveMonths.length }}
          </div>
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Exclusive Month{{ territory.exclusiveMonths.length !== 1 ? 's' : '' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="month in territory.exclusiveMonths"
            :key="month"
            class="bg-primary-50 text-primary-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md border border-primary-100">
            {{ formatMonth(month) }}
          </span>
        </div>
      </div>
    </div>

    <footer class="mt-auto flex justify-end p-3">
      <AmIButton
        title="Cancel Territory"
        :disabled="isCancelling"
        bg-colour="bg-red-50"
        text-colour="text-red-600"
        animation-colour="bg-red-100"
        class="!px-3 !py-1.5 text-xs shadow-none border border-red-100 group-hover:border-red-200 transition-colors w-max"
        @click="$emit('cancel', territory.territoryId)">
        <div class="flex items-center gap-1.5 font-bold">
          <span
            v-if="isCancelling"
            class="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"></span>
          <span v-else>&times;</span>
          <span>{{ isCancelling ? 'Cancelling...' : 'Cancel Territory' }}</span>
        </div>
      </AmIButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MapPin, CheckSquareIcon } from 'lucide-vue-next';

// 1. Define what data this card needs from the parent
const props = defineProps({
  territory: {
    type: Object,
    required: true
  },
  isCancelling: {
    type: Boolean,
    default: false
  }
});

// 2. Define the events this card can send back to the parent
defineEmits(['cancel']);

// 3. Bring in the global data needed just for formatting names
const { categories: categoriesData } = useCategories();
const { getTerritoryById } = useTerritories();

// 4. Formatting Helpers
const locationName = computed(() => {
  const t = getTerritoryById(props.territory.territoryId);
  return t ? t.name : `Region #${props.territory.territoryId}`;
});

const categoryName = computed(() => {
  if (!categoriesData.value) return props.territory.categoryValue;
  const found = categoriesData.value.find(
    (c: any) => c.id === props.territory.categoryValue || c.label === props.territory.categoryValue
  );
  return found ? found.label || found.id : props.territory.categoryValue;
});

const territoryBand = computed(() => {
  const t = getTerritoryById(props.territory.territoryId);
  // Return the band from the JSON, or default to 1 as a safety fallback
  return t ? t.band : 1;
});

const headerBg = computed(() => {
  switch (territoryBand.value) {
    case 1:
      return 'bg-secondary-400';
    case 2:
      return 'bg-secondary-500';
    case 3:
      return 'bg-secondary-600';
    case 4:
      return 'bg-secondary-700';
    case 5:
      return 'bg-secondary-800';
    default:
      return 'bg-secondary-500';
  }
});

const formatMonth = (monthString: string) => {
  if (!monthString) return '';
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year || '0'), parseInt(month || '0') - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};
</script>
