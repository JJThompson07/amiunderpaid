<template>
  <div
    class="relative w-full h-125 md:h-150 bg-linear-to-t from-secondary-50 to-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
    <div ref="mapContainer" class="w-full h-full"></div>

    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
      <div class="flex flex-col items-center gap-3">
        <div
          class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <AmILoader :message="$t('common.loading-item', { item: country })" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue';
import * as echarts from 'echarts';
import type { CountryCode } from '../../pages/recruiter/territories/index.vue';

const props = defineProps<{
  country: CountryCode;
  claimedIds: number[];
  territories: any[];
  selectedIds: number[];
}>();

const emit = defineEmits(['territory-clicked']);

const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
const chart = shallowRef<echarts.ECharts | null>(null);

const territoryLookup = computed(() => {
  const lookup = new Map<string, any>();

  props.territories.forEach((t) => {
    // Index the main territory name
    lookup.set(normalizeName(t.name), t);

    // Index all associated ONS names (Crucial for UK maps)
    if (t.ons_matches) {
      t.ons_matches.forEach((ons: any) => {
        lookup.set(normalizeName(ons.name), t);
      });
    }
  });

  return lookup;
});

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
    .replace(/County of /gi, '')
    .replace(/&/g, 'and')
    .trim()
    .toLowerCase();
};

const loadAndDrawMap = async () => {
  if (!mapContainer.value) return;
  loading.value = true; // Lock the shield!

  try {
    const fileName = props.country === 'UK' ? '/uk-regions.json' : '/us-regions.json';
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
      const matchedTerritory = territoryLookup.value.get(clickedName);

      if (matchedTerritory) {
        // BLOCK CLICK IF ALREADY CLAIMED!
        if (props.claimedIds.includes(matchedTerritory.id)) return;

        emit('territory-clicked', matchedTerritory);
      } else {
        console.warn(`No match found in constants for map shape: ${params.name}`);
      }
    });

    loading.value = false;

    updateMapData();
  } catch (error) {
    console.error(`Failed to load ${props.country} map data:`, error);
    loading.value = false;
  }
};

const updateMapData = () => {
  // RACE CONDITION SHIELD
  if (!chart.value || loading.value) return;

  const mapData: any[] = [];

  const white = getThemeColor('--color-white', '#ffffff');
  const slate100 = getThemeColor('--color-slate-100', '#f1f5f9');
  const slate200 = getThemeColor('--color-slate-200', '#e2e8f0');
  const slate400 = getThemeColor('--color-slate-400', '#94a3b8');
  const primary100 = getThemeColor('--color-primary-100', '#cef9f6');
  const primary500 = getThemeColor('--color-primary-500', '#1cabb0');
  const primary600 = getThemeColor('--color-primary-600', '#14868d');
  const secondary200 = getThemeColor('--color-secondary-200', '#c8ddef');
  const secondary600 = getThemeColor('--color-secondary-600', '#2c699d');

  // 1. Grab the raw GeoJSON memory that ECharts is using
  const mapObj = echarts.getMap(props.country);
  if (!mapObj || !mapObj.geoJSON) return;

  const nameProp = props.country === 'UK' ? 'ctyua18nm' : 'name';

  // 2. Loop through every single polygon on the actual map
  mapObj.geoJSON.features.forEach((feature: any) => {
    const rawGeoName = feature.properties[nameProp];
    if (!rawGeoName) return;

    // Normalize the map's name using your updated function
    const normalizedGeoName = normalizeName(rawGeoName);

    // 3. Check if this polygon exists in our active territories
    const matchedTerritory = territoryLookup.value.get(normalizedGeoName);

    // 4. If it's a match, tell ECharts to color it using the RAW GeoJSON name!
    if (matchedTerritory) {
      const isSelected = props.selectedIds.includes(matchedTerritory.id);
      const isClaimed = props.claimedIds.includes(matchedTerritory.id);

      if (isClaimed) {
        mapData.push({
          name: rawGeoName,
          value: 2, // Arbitrary value to separate it from selected
          itemStyle: {
            areaColor: secondary200,
            borderColor: secondary600,
            borderWidth: 1.5
          },
          emphasis: {
            disabled: true // Keep it green on hover
          },
          cursor: 'not-allowed'
        });
      } else {
        mapData.push({
          name: rawGeoName,
          value: isSelected ? 1 : 0,
          itemStyle: {
            areaColor: isSelected ? primary500 : white,
            borderColor: isSelected ? primary600 : slate400,
            borderWidth: isSelected ? 2 : 1
          },
          emphasis: {
            disabled: false,
            itemStyle: {
              areaColor: isSelected ? primary500 : primary100,
              borderColor: primary600,
              borderWidth: 1.5
            }
          },
          cursor: 'pointer'
        });
      }
    }
  });

  chart.value.setOption(
    {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          // Hide tooltip for greyed out areas
          if (!params.data) return undefined;
          return params.name;
        }
      },
      series: [
        {
          type: 'map',
          map: props.country,
          roam: true,
          nameProperty: nameProp,
          scaleLimit: { min: 1, max: 8 },

          // BASE MAP SETTINGS (Disabled styling)
          cursor: 'default',
          itemStyle: {
            areaColor: slate100,
            borderColor: slate200,
            borderWidth: 1
          },
          emphasis: {
            disabled: true,
            label: { show: false }
          },

          // Inject our active locations over the top
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
