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
}>();

// ECharts can read CSS Custom Properties natively!
// We just pass the string to the canvas exactly as we would in CSS.
const MAP_COLORS = {
  white: 'white', // ECharts understands basic color strings
  slate400: '#94a3b8',
  // Map these directly to the Tailwind v4 @theme variables you just showed me
  primary100: 'var(--color-primary-100)',
  primary500: 'var(--color-primary-500)',
  primary600: 'var(--color-primary-600)'
};

const emit = defineEmits(['territory-clicked']);

const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
const chart = shallowRef<echarts.ECharts | null>(null);

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
  loading.value = true;

  try {
    const fileName = props.country === 'uk' ? '/uk-regions.json' : '/us-regions.json';
    const response = await fetch(fileName);
    const geoJson = await response.json();

    // Register map. If UK ONS data uses 'ctyua18nm' for names, tell ECharts to look there!
    echarts.registerMap(props.country, geoJson);

    if (!chart.value) {
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
    } else {
      chart.value.clear();
    }

    updateMapData();
    loading.value = false;
  } catch (error) {
    console.error(`Failed to load ${props.country} map data:`, error);
    loading.value = false;
  }
};

const updateMapData = () => {
  if (!chart.value) return;
  const mapData: any[] = [];

  props.territories.forEach((t) => {
    const isClaimed = props.claimedIds.includes(t.id);
    const itemStyle = {
      areaColor: isClaimed ? MAP_COLORS.primary500 : MAP_COLORS.white,
      borderColor: isClaimed ? MAP_COLORS.primary600 : MAP_COLORS.slate400,
      borderWidth: isClaimed ? 1.5 : 1
    };

    mapData.push({ name: t.name, value: isClaimed ? 1 : 0, itemStyle });

    if (t.ons_matches) {
      t.ons_matches.forEach((ons: any) => {
        mapData.push({ name: ons.name, value: isClaimed ? 1 : 0, itemStyle });
      });
    }
  });

  chart.value.setOption({
    tooltip: { trigger: 'item', formatter: '{b}' },
    series: [
      {
        type: 'map',
        map: props.country,
        roam: true,
        scaleLimit: { min: 1, max: 8 },
        itemStyle: {
          areaColor: MAP_COLORS.white,
          borderColor: MAP_COLORS.slate400,
          borderWidth: 1
        },
        emphasis: {
          itemStyle: {
            areaColor: MAP_COLORS.primary100,
            borderColor: MAP_COLORS.primary600,
            borderWidth: 1.5
          },
          label: { show: false }
        },
        data: mapData
      }
    ]
  });
};

watch(() => props.country, loadAndDrawMap);
watch(() => props.claimedIds, updateMapData, { deep: true });

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
