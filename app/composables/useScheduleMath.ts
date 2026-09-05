// app/composables/useScheduleMath.ts
import type {
  ScheduleSelection,
  Territory,
  UpcomingMonth
} from '~/components/Territory/ScheduleMatrix.vue';

import type { CountryPricingBands } from '~/composables/usePricing';

import type { TerritoryClaim } from '~~/shared/utils/types';

type RowConfig = {
  isBasic: boolean;
  selectedMonths: Set<string>;
  lockedBasic: boolean;
  lockedMonths: Set<string>;
  // True when this row's Basic lock comes from national coverage rather than
  // a real, individually-purchased TerritoryClaim -- national is billed as a
  // single flat charge elsewhere, so these rows must never be re-billed for
  // Basic through this cart (see isNationallyCovered below).
  isNational: boolean;
};

type CategoryOption = { label: string; value: string };

export type ScheduleMathEmit = {
  (e: 'update:selections', payload: ScheduleSelection[]): void;
  (e: 'update:total', payload: { payNow: number; nextMonth: number; total7Months: number }): void;
};

type BillingCountry = 'UK' | 'USA';

type RowPricing = { basic: number; exclusive: number };

type MatrixRow = {
  id: string;
  territory: Territory;
  categoryValue: string;
  categoryLabel: string;
};

type UseScheduleMathReturn = {
  matrixRows: ComputedRef<MatrixRow[]>;
  upcomingMonths: ComputedRef<UpcomingMonth[]>;
  currencySymbol: ComputedRef<string>;
  isPastHalfway: ComputedRef<boolean>;
  matrixTotal: Ref<number>;
  payNowTotal: Ref<number>;
  nextMonthTotal: Ref<number>;
  toggleBasic: (rowId: string) => void;
  toggleMonth: (rowId: string, monthValue: string) => void;
  isBasic: (rowId: string) => boolean;
  isMonthSelected: (rowId: string, monthValue: string) => boolean;
  isBasicLocked: (rowId: string) => boolean;
  isBasicNational: (rowId: string) => boolean;
  isMonthLocked: (rowId: string, monthValue: string) => boolean;
  isMonthTaken: (rowId: string, monthStr: string) => boolean;
  getMonthDisplayPrice: (
    rowId: string,
    monthValue: string,
    index: number,
    band: number | undefined
  ) => number | null;
  getRowPricing: (band: number | undefined) => RowPricing;
};

export const useScheduleMath = (
  props: {
    territories: Territory[];
    categories: string[];
    categoryOptions: CategoryOption[];
    // NEW: Accept the globally taken months from the database
    takenMonths?: Record<string, string[]>;
  },
  emit: ScheduleMathEmit
): UseScheduleMathReturn => {
  const { pricingData } = usePricing();
  const { userProfile } = useUserProfile();

  // State
  const rowConfigs = ref<Map<string, RowConfig>>(new Map());
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

  const upcomingMonths = computed((): UpcomingMonth[] => {
    const months: UpcomingMonth[] = [];
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

  const getOwnedTerritory = (territoryId: number, categoryValue: string): TerritoryClaim | null => {
    if (!userProfile.value) {
      return null;
    }
    const active = userProfile.value.activeTerritories || userProfile.value.claims || [];
    return (
      active.find((t) => t.territoryId === territoryId && t.categoryValue === categoryValue) || null
    );
  };

  const getCategoryLabel = (val: string): string => {
    const found = props.categoryOptions.find((c) => c.value === val);
    return found ? found.label : val;
  };

  // Matches the UK/USA territoryId boundary used server-side in
  // recruiter-card.get.ts: RECRUITER_TERRITORIES_UK ids run 1-108,
  // RECRUITER_TERRITORIES_USA ids run 190-254.
  // Locks on 'pending' too, not just 'active' -- once the recruiter confirms a
  // pending grant, webhook.post.ts wipes any local Basic territory it finds in
  // the target country with no refund, so a local Basic purchase made while
  // national is merely pending would otherwise be silently lost.
  const isNationallyCovered = (territoryId: number): boolean => {
    return territoryId < 200
      ? Boolean(userProfile.value?.ukNationalStatus)
      : Boolean(userProfile.value?.usaNationalStatus);
  };

  const matrixRows = computed((): MatrixRow[] => {
    const rows: MatrixRow[] = [];
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
          const owned = getOwnedTerritory(territory.id, category);
          // National coverage only locks the Basic column when there's no
          // real claim already recorded for this exact territory+category --
          // a real claim's own isBasic/lockedBasic state always wins.
          const nationallyCovered = !owned && isNationallyCovered(territory.id);
          rowConfigs.value.set(rowId, {
            isBasic: owned ? owned.isBasic : nationallyCovered,
            selectedMonths: new Set(owned?.exclusiveMonths || []),
            lockedBasic: owned ? owned.isBasic : nationallyCovered,
            lockedMonths: new Set(owned?.exclusiveMonths || []),
            isNational: nationallyCovered
          });
        }
      }
    }
    return rows;
  });

  const getRowPricing = (band: number | undefined): RowPricing => {
    const safeBand = band || 1;
    const countryPricing = pricingData.value?.[billingCountry.value as BillingCountry];
    if (!countryPricing) {
      return { basic: 0, exclusive: 0 };
    }

    // 1. Get base prices from the platform settings
    const bandKey = `band${safeBand}` as keyof CountryPricingBands;
    const basePrices = countryPricing[bandKey] || {
      basic: 0,
      exclusive: 0
    };

    // 2. Get recruiter-specific discounts from their profile
    const basicDiscount = userProfile.value?.basicDiscount || 0;
    const exclusiveDiscount = userProfile.value?.exclusiveDiscount || 0;

    // 3. Apply percentage discounts
    const discountedBasic = basePrices.basic * (1 - basicDiscount / 100);
    const discountedExclusive = basePrices.exclusive * (1 - exclusiveDiscount / 100);

    return {
      basic: Math.max(0, discountedBasic),
      exclusive: Math.max(0, discountedExclusive)
    };
  };

  // NEW: Helper to check if a month is owned by someone else
  const isMonthTaken = (rowId: string, monthStr: string): boolean => {
    // 1. Safety check: Are there any locks at all?
    if (!props.takenMonths) {
      return false;
    }

    // 2. Get the array of locked months for this specific territory/category row
    const lockedMonthsForThisRow = props.takenMonths[rowId];

    // 3. If the row isn't in the database, or the month isn't in the array, it's free!
    if (!lockedMonthsForThisRow) {
      return false;
    }

    // 4. Return true if someone else owns this month
    return lockedMonthsForThisRow.includes(monthStr);
  };

  const getMonthDisplayPrice = (
    rowId: string,
    monthValue: string,
    index: number,
    band: number | undefined
  ): number | null => {
    const config = rowConfigs.value.get(rowId);
    if (!config) {
      return null;
    }
    const prices = getRowPricing(band);

    const upgradeCost = config.isBasic ? prices.exclusive - prices.basic : prices.exclusive;

    if (config.selectedMonths.has(monthValue)) {
      const isFirstMonth = index === 0;
      const baseVisual = isFirstMonth && config.isBasic ? upgradeCost : prices.exclusive;
      return isFirstMonth && isPastHalfway.value ? baseVisual / 2 : baseVisual;
    } else if (config.isBasic) {
      // UPDATED: Show 0 if the month is taken by someone else
      const isTaken = isMonthTaken(rowId, monthValue);
      return index === 0 || isTaken ? 0 : prices.basic;
    }
    return null;
  };

  const toggleBasic = (rowId: string): void => {
    const config = rowConfigs.value.get(rowId);
    if (config && !config.lockedBasic) {
      config.isBasic = !config.isBasic;
      emitUpdates();
    }
  };

  const toggleMonth = (rowId: string, monthValue: string): void => {
    const config = rowConfigs.value.get(rowId);
    // UPDATED: Prevent toggling if the month is globally taken
    if (config && !config.lockedMonths.has(monthValue) && !isMonthTaken(rowId, monthValue)) {
      if (config.selectedMonths.has(monthValue)) {
        config.selectedMonths.delete(monthValue);
      } else {
        config.selectedMonths.add(monthValue);
      }
      emitUpdates();
    }
  };

  const isBasic = (rowId: string): boolean => rowConfigs.value.get(rowId)?.isBasic || false;
  const isMonthSelected = (rowId: string, monthValue: string): boolean =>
    rowConfigs.value.get(rowId)?.selectedMonths.has(monthValue) || false;
  const isBasicLocked = (rowId: string): boolean =>
    rowConfigs.value.get(rowId)?.lockedBasic || false;
  const isBasicNational = (rowId: string): boolean =>
    rowConfigs.value.get(rowId)?.isNational || false;
  const isMonthLocked = (rowId: string, monthValue: string): boolean =>
    rowConfigs.value.get(rowId)?.lockedMonths.has(monthValue) || false;

  const emitUpdates = (): void => {
    const payload: ScheduleSelection[] = [];
    let calcMatrixTotal = 0,
      calcPayNow = 0,
      calcNextMonth = 0;

    for (const row of matrixRows.value) {
      const config = rowConfigs.value.get(row.id);
      if (!config) {
        continue;
      }

      const prices = getRowPricing(row.territory.band);
      // National coverage grants this row's Basic tier through a separate
      // flat charge (see set-national.post.ts) -- it must never be re-billed
      // as a per-territory Basic purchase here, even though `config.isBasic`
      // stays true internally so the exclusive-month "upgrade" discount below
      // still applies correctly.
      const billableBasic = config.isBasic && !config.isNational;

      if (billableBasic || config.selectedMonths.size > 0) {
        let rowTotalCost = 0;
        const upfrontUpgradeCost = config.isBasic
          ? prices.exclusive - prices.basic
          : prices.exclusive;

        upcomingMonths.value.forEach((month, index) => {
          let visualMonthCost = 0;
          const isFirstMonth = index === 0;

          if (config.selectedMonths.has(month.value)) {
            const baseVisual =
              isFirstMonth && config.isBasic ? upfrontUpgradeCost : prices.exclusive;
            visualMonthCost = isFirstMonth && isPastHalfway.value ? baseVisual / 2 : baseVisual;

            if (!config.lockedMonths.has(month.value)) {
              const upfrontCost =
                isFirstMonth && isPastHalfway.value ? upfrontUpgradeCost / 2 : upfrontUpgradeCost;
              calcPayNow += upfrontCost;
            }
          } else if (billableBasic) {
            // UPDATED MATH: Do not charge for this month if it's taken
            const isTaken = isMonthTaken(row.id, month.value);
            visualMonthCost = isFirstMonth || isTaken ? 0 : prices.basic;
          }

          rowTotalCost += visualMonthCost;
        });

        calcMatrixTotal += rowTotalCost;
        if (billableBasic) {
          calcNextMonth += prices.basic;
        }

        payload.push({
          territoryId: row.territory.id,
          territoryName: row.territory.name,
          band: row.territory.band || 1,
          categoryValue: row.categoryValue,
          isBasic: billableBasic,
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

  const getTakenMonths = (): Record<string, string[]> | undefined => props.takenMonths;

  watch([matrixRows, pricingData, getTakenMonths, userProfile], emitUpdates, {
    immediate: true,
    deep: true
  });

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
    isBasicLocked,
    isBasicNational,
    isMonthLocked,
    isMonthTaken,
    getMonthDisplayPrice,
    getRowPricing
  };
};
