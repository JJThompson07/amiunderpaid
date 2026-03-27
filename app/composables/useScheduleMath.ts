// app/composables/useScheduleMath.ts
import { ref, computed, watch } from 'vue';
import type { Territory } from '~/components/Territory/ScheduleMatrix.vue';

export const useScheduleMath = (
  props: { territories: Territory[]; categories: string[]; categoryOptions: any[] },
  emit: any
) => {
  const { pricingData } = usePricing();
  const { userProfile } = useUserProfile();

  // State
  const rowConfigs = ref<Map<string, { isBasic: boolean; selectedMonths: Set<string> }>>(new Map());
  const matrixTotal = ref(0);
  const payNowTotal = ref(0);
  const nextMonthTotal = ref(0);

  // Billing
  const billingCountry = computed(() => userProfile.value?.billingCountry || 'UK');
  const currencySymbol = computed(() => (billingCountry.value === 'UK' ? '£' : '$'));

  // Dates
  const isPastHalfway = computed(() => {
    const now = new Date();
    return now.getDate() > new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() / 2;
  });

  const upcomingMonths = computed(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        value: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        label: targetDate.toLocaleString('default', { month: 'short' }),
        year: targetDate.getFullYear()
      });
    }
    return months;
  });

  // Rows & Helpers
  const getCategoryLabel = (val: string) => {
    const found = props.categoryOptions.find((c) => c.value === val);
    return found ? found.label : val;
  };

  const matrixRows = computed(() => {
    const rows = [];
    for (const territory of props.territories) {
      for (const category of props.categories) {
        const rowId = `${territory.id}|${category}`;
        rows.push({
          id: rowId,
          territory,
          categoryValue: category,
          categoryLabel: getCategoryLabel(category)
        });
        if (!rowConfigs.value.has(rowId)) {
          rowConfigs.value.set(rowId, { isBasic: false, selectedMonths: new Set() });
        }
      }
    }
    return rows;
  });

  const getRowPricing = (band: number | undefined) => {
    const safeBand = band || 1;
    if (!pricingData.value || !pricingData.value[billingCountry.value])
      return { basic: 0, exclusive: 0 };
    return pricingData.value[billingCountry.value][`band${safeBand}`] || { basic: 0, exclusive: 0 };
  };

  const getMonthDisplayPrice = (
    rowId: string,
    monthValue: string,
    index: number,
    band: number | undefined
  ) => {
    const config = rowConfigs.value.get(rowId);
    if (!config) return null;
    const prices = getRowPricing(band);

    if (config.selectedMonths.has(monthValue)) {
      return index === 0 && isPastHalfway.value ? prices.exclusive / 2 : prices.exclusive;
    } else if (config.isBasic) {
      return index === 0 ? 0 : prices.basic;
    }
    return null;
  };

  // Interactions
  const toggleBasic = (rowId: string) => {
    const config = rowConfigs.value.get(rowId);
    if (config) {
      config.isBasic = !config.isBasic;
      emitUpdates();
    }
  };

  const toggleMonth = (rowId: string, monthValue: string) => {
    const config = rowConfigs.value.get(rowId);
    if (config) {
      if (config.selectedMonths.has(monthValue)) {
        config.selectedMonths.delete(monthValue);
      } else {
        config.selectedMonths.add(monthValue);
      }
      emitUpdates();
    }
  };

  const isBasic = (rowId: string) => rowConfigs.value.get(rowId)?.isBasic || false;
  const isMonthSelected = (rowId: string, monthValue: string) =>
    rowConfigs.value.get(rowId)?.selectedMonths.has(monthValue) || false;

  // The Big Math Loop
  const emitUpdates = () => {
    const payload = [];
    let calcMatrixTotal = 0,
      calcPayNow = 0,
      calcNextMonth = 0;

    for (const row of matrixRows.value) {
      const config = rowConfigs.value.get(row.id);
      if (!config) continue;

      const prices = getRowPricing(row.territory.band);

      if (config.isBasic || config.selectedMonths.size > 0) {
        let rowTotalCost = 0;

        upcomingMonths.value.forEach((month, index) => {
          let monthCost = 0;
          if (config.selectedMonths.has(month.value)) {
            monthCost =
              index === 0 && isPastHalfway.value ? prices.exclusive / 2 : prices.exclusive;
          } else if (config.isBasic) {
            monthCost = index === 0 ? 0 : prices.basic;
          }

          rowTotalCost += monthCost;
          if (index === 0) calcPayNow += monthCost;
          if (index === 1) calcNextMonth += monthCost;
        });

        calcMatrixTotal += rowTotalCost;
        payload.push({
          territoryId: row.territory.id,
          territoryName: row.territory.name,
          band: row.territory.band || 1,
          categoryValue: row.categoryValue,
          isBasic: config.isBasic,
          exclusiveMonths: Array.from(config.selectedMonths),
          rowCost: rowTotalCost
        });
      }
    }

    matrixTotal.value = calcMatrixTotal;
    payNowTotal.value = calcPayNow;
    nextMonthTotal.value = calcNextMonth;

    emit('update:selections', payload);
    emit('update:total', {
      payNow: calcPayNow,
      nextMonth: calcNextMonth,
      total7Months: calcMatrixTotal
    });
  };

  watch([matrixRows, pricingData], emitUpdates, { immediate: true, deep: true });

  return {
    matrixRows,
    upcomingMonths,
    currencySymbol,
    isPastHalfway,
    matrixTotal,
    payNowTotal,
    nextMonthTotal,
    toggleBasic,
    toggleMonth,
    isBasic,
    isMonthSelected,
    getMonthDisplayPrice,
    getRowPricing
  };
};
