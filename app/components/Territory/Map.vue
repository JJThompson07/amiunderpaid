<template>
  <div
    class="relative w-full h-125 md:h-150 bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
    <div ref="mapContainer" class="w-full h-full"></div>

    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-bold">Loading {{ country.toUpperCase() }} map...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
  country: 'uk' | 'usa';
  claimedIds: number[];
  territories: any[];
  selectedIds: number[];
}>();

const emit = defineEmits(['territory-clicked']);

const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
const chart = shallowRef<echarts.ECharts | null>(null);

const getThemeColor = (cssVar: string, fallback: string) => {
  if (!import.meta.client) return fallback;
  const val = getComputedStyle(document.body).getPropertyValue(cssVar).trim();
  return val || fallback;
};

const normalizeName = (name: string) => {
  if (!name) return '';
  return name
    .replace(/, City of/gi, '')
    .replace(/City of /gi, '')
    .replace(/, County of/gi, '')
    .replace(/&/g, 'and')
    .trim()
    .toLowerCase();
};

const loadAndDrawMap = async () => {
  if (!mapContainer.value) return;
  loading.value = true; // Lock the shield!

  try {
    const fileName = props.country === 'uk' ? '/uk-regions.json' : '/us-regions.json';
    const response = await fetch(fileName);

    if (!response.ok) {
      console.error(`ERROR: Could not find ${fileName} in your public folder!`);
      loading.value = false;
      return;
    }

    const geoJson = await response.json();
    echarts.registerMap(props.country, geoJson);

    // RACE CONDITION FIX: Destroy the old map memory to prevent phantom clicks
    if (chart.value) {
      chart.value.dispose();
      chart.value = null;
    }

    // Initialize fresh
    chart.value = echarts.init(mapContainer.value);

    chart.value.on('click', (params: any) => {
      const clickedName = normalizeName(params.name);
      const matchedTerritory = props.territories.find(
        (t) =>
          normalizeName(t.name) === clickedName ||
          (t.ons_matches &&
            t.ons_matches.some((ons: any) => normalizeName(ons.name) === clickedName))
      );

      if (matchedTerritory) {
        emit('territory-clicked', matchedTerritory);
      } else {
        console.warn(`No match found in constants for map shape: ${params.name}`);
      }
    });

    // IMPORTANT: Unlock the shield BEFORE updating the data!
    loading.value = false;
    updateMapData();
  } catch (error) {
    console.error(`Failed to load ${props.country} map data:`, error);
    loading.value = false;
  }
};

const updateMapData = () => {
  // RACE CONDITION SHIELD: Block updates if map is downloading or missing
  if (!chart.value || loading.value) return;

  const mapData: any[] = [];

  const white = '#ffffff';
  const slate400 = '#94a3b8';
  const primary100 = getThemeColor('--color-primary-100', '#cef9f6');
  const primary500 = getThemeColor('--color-primary-500', '#1cabb0');
  const primary600 = getThemeColor('--color-primary-600', '#14868d');

  props.territories.forEach((t) => {
    const isSelected = props.selectedIds.includes(t.id);

    const itemStyle = {
      areaColor: isSelected ? primary500 : white,
      borderColor: isSelected ? primary600 : slate400,
      borderWidth: isSelected ? 2 : 1
    };

    mapData.push({ name: t.name, value: isSelected ? 1 : 0, itemStyle });

    if (t.ons_matches) {
      t.ons_matches.forEach((ons: any) => {
        mapData.push({ name: ons.name, value: isSelected ? 1 : 0, itemStyle });
      });
    }
  });

  chart.value.setOption(
    {
      tooltip: { trigger: 'item', formatter: '{b}' },
      series: [
        {
          type: 'map',
          map: props.country,
          roam: true,
          nameProperty: props.country === 'uk' ? 'ctyua18nm' : 'name',
          scaleLimit: { min: 1, max: 8 },
          itemStyle: {
            areaColor: white,
            borderColor: slate400,
            borderWidth: 1
          },
          emphasis: {
            itemStyle: { areaColor: primary100, borderColor: primary600, borderWidth: 1.5 },
            label: { show: false }
          },
          data: mapData
        }
      ]
    },
    true // notMerge
  );
};

// We ONLY watch the country and the selection now.
// We removed the `territories` watch to kill the double-trigger bug.
watch(() => props.country, loadAndDrawMap);
watch(() => props.selectedIds, updateMapData, { deep: true });

onMounted(() => {
  if (import.meta.client) {
    loadAndDrawMap();
    window.addEventListener('resize', () => chart.value?.resize());
  }
});

onBeforeUnmount(() => {
  if (chart.value) chart.value.dispose();
  window.removeEventListener('resize', () => chart.value?.resize());
});
</script>
