import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useScheduleMath } from '../useScheduleMath';

const mockPricingData = { value: null } as any;
const mockUserProfile = { value: null } as any;

vi.stubGlobal('usePricing', () => ({ pricingData: mockPricingData }));
vi.stubGlobal('useUserProfile', () => ({ userProfile: mockUserProfile }));

vi.stubGlobal('ref', (val: any) => {
  return { value: val };
});
vi.stubGlobal('computed', (fn: any) => {
  return {
    get value() {
      return fn();
    }
  };
});
vi.stubGlobal('watch', (source: any, cb: any, options: any) => {
  if (options?.immediate) {
    cb();
  }
});

describe('useScheduleMath', () => {
  let emitMock: any;
  let props: any;

  beforeEach(() => {
    emitMock = vi.fn();
    props = {
      territories: [{ id: 1, name: 'London', band: 1 }],
      categories: ['IT', 'HR'],
      categoryOptions: [
        { value: 'IT', label: 'Info Tech' },
        { value: 'HR', label: 'Human Res' }
      ],
      takenMonths: {
        '1|IT': ['2023-10', '2023-11']
      }
    };
    mockPricingData.value = {
      UK: {
        band1: { basic: 100, exclusive: 500 }
      }
    };
    mockUserProfile.value = {
      billingCountry: 'UK',
      basicDiscount: 0,
      exclusiveDiscount: 0,
      activeTerritories: [],
      claims: []
    };
    vi.clearAllMocks();
  });

  it('calculates correct row pricing without discounts', () => {
    const { getRowPricing } = useScheduleMath(props, emitMock);
    const pricing = getRowPricing(1);
    expect(pricing).toEqual({ basic: 100, exclusive: 500 });
  });

  it('calculates correct row pricing with user discounts', () => {
    mockUserProfile.value = {
      ...mockUserProfile.value,
      basicDiscount: 10,
      exclusiveDiscount: 20
    };
    const { getRowPricing } = useScheduleMath(props, emitMock);
    const pricing = getRowPricing(1);
    expect(pricing).toEqual({ basic: 90, exclusive: 400 });
  });

  it('identifies if a month is taken', () => {
    const { isMonthTaken } = useScheduleMath(props, emitMock);
    expect(isMonthTaken('1|IT', '2023-10')).toBe(true);
    expect(isMonthTaken('1|IT', '2023-12')).toBe(false);
    expect(isMonthTaken('1|HR', '2023-10')).toBe(false);
  });

  it('generates upcoming months correctly', () => {
    const { upcomingMonths } = useScheduleMath(props, emitMock);
    expect(upcomingMonths.value.length).toBe(7);
    expect(upcomingMonths.value[0].value).toMatch(/^\d{4}-\d{2}$/);
  });

  it('toggles basic subscription and emits update', () => {
    const { toggleBasic, isBasic } = useScheduleMath(props, emitMock);
    const rowId = '1|IT';

    expect(isBasic(rowId)).toBe(false);
    toggleBasic(rowId);
    expect(isBasic(rowId)).toBe(true);

    expect(emitMock).toHaveBeenCalled();
  });

  it('prevents toggling month if globally taken', () => {
    const { toggleMonth, isMonthSelected } = useScheduleMath(props, emitMock);
    const rowId = '1|IT';

    toggleMonth(rowId, '2023-10');
    expect(isMonthSelected(rowId, '2023-10')).toBe(false);

    toggleMonth(rowId, '2023-12');
    expect(isMonthSelected(rowId, '2023-12')).toBe(true);
  });

  it('returns currency symbol based on billing country', () => {
    const { currencySymbol } = useScheduleMath(props, emitMock);
    expect(currencySymbol.value).toBe('£');

    mockUserProfile.value = { billingCountry: 'USA' };
    expect(currencySymbol.value).toBe('$');
  });
});
