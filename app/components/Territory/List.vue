<template>
  <div
    class="territory-list bg-white p-4 rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
    <h2 class="text-xl font-black text-slate-900 p-2">{{ $t('recruiter.territories.list') }}</h2>
    <div class="overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4 p-2" :class="[maxHeight]">
      <div
        v-for="group in groupedOptions"
        :key="group.group"
        class="flex flex-col gap-2 rounded-lg shadow-xs overflow-hidden"
        :class="[groupBgColour]">
        <button
          class="flex items-center justify-between w-full text-left font-semibold text-slate-800 hover:text-primary-600 transition-colors p-2"
          :class="{ 'border-b-2 border-primary-600': openGroups.has(group.group) }"
          @click="toggleGroup(group.group)">
          <div class="flex justify-between gap-2 items-center w-full">
            <span class="font-bold">
              {{ group.group }}
              <span class="text-slate-500 font-normal text-2xs">{{
                $t('recruiter.territories.count', { count: group.options.length })
              }}</span>
            </span>
            <span class="flex gap-2 items-center">
              <AmIChip
                v-if="groupItemsSelected(group.options)"
                text-size="text-2xs"
                bg-colour="bg-primary-100"
                text-colour="text-primary-700"
                compact>
                {{
                  $t('recruiter.territories.selected', { count: groupItemsSelected(group.options) })
                }}
              </AmIChip>
              <ChevronDownIcon
                class="w-4 h-4 text-slate-900 transition-transform duration-200 ease-in-out"
                :class="{ 'rotate-180': openGroups.has(group.group) }" />
            </span>
          </div>
        </button>

        <div
          v-show="openGroups.has(group.group)"
          class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 w-full p-2">
          <div
            v-for="option in group.options"
            :key="option.id"
            class="flex items-center justify-between p-2.5 rounded-lg shadow-xs group cursor-pointer transition-all duration-300 ease-in-out w-auto"
            :class="[
              isSelected(option.id)
                ? [selectedBgColour, selectedBorderColour, selectedTextColour]
                : [bgColour, borderColour, textColour],
              hoverColour
            ]"
            @click="$emit('territory-click', option)">
            <div class="flex items-center gap-2 overflow-hidden">
              <span class="font-semibold text-xs truncate">
                {{ option.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from 'lucide-vue-next';
import { computed, ref, type PropType } from 'vue';

export type TerritoryListOption = {
  name: string;
  id: string | number;
  region: string;
};

export type GroupedTerritoryListOption = {
  group: string;
  options: TerritoryListOption[];
};

const props = defineProps({
  options: {
    type: Array as PropType<TerritoryListOption[]>,
    required: true
  },
  selectedOptions: {
    type: Array as PropType<TerritoryListOption[]>,
    required: true
  },
  bgColour: {
    type: String,
    default: 'bg-slate-50'
  },
  textColour: {
    type: String,
    default: 'text-slate-700'
  },
  borderColour: {
    type: String,
    default: 'border-slate-200'
  },
  selectedBgColour: {
    type: String,
    default: 'bg-primary-300'
  },
  selectedTextColour: {
    type: String,
    default: 'text-primary-700'
  },
  selectedBorderColour: {
    type: String,
    default: 'border-primary-200'
  },
  hoverColour: {
    type: String,
    default: 'hover:bg-primary-400/50'
  },
  maxHeight: {
    type: String,
    default: 'max-h-125'
  },
  groupBgColour: {
    type: String,
    default: 'bg-slate-100'
  }
});

defineEmits(['territory-click', 'territory-remove']);

// Accordion State
const openGroups = ref<Set<string>>(new Set());

const groupedOptions = computed(() => {
  const map = new Map<string, GroupedTerritoryListOption>();

  for (const option of props.options) {
    const regionName = option.region;

    if (!map.has(regionName)) {
      map.set(regionName, { group: regionName, options: [] });
    }

    map.get(regionName)!.options.push(option);
  }

  return Array.from(map.values());
});

const toggleGroup = (groupName: string) => {
  if (openGroups.value.has(groupName)) {
    openGroups.value.delete(groupName);
  } else {
    openGroups.value.add(groupName);
  }
};

const isSelected = (id: number | string) => {
  return Boolean(
    props.selectedOptions.find((s) => {
      if (typeof s === 'string') {
        return s === id;
      } else {
        return s.id === id;
      }
    })
  );
};

const groupItemsSelected = (options: TerritoryListOption[]) => {
  return options.filter((option) => isSelected(option.id)).length;
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
</style>
