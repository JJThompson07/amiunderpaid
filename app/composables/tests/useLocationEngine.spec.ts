import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLocationEngine } from '../useLocationEngine';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockRoute = { query: {} as any, params: {} as any };
vi.stubGlobal('useRoute', () => mockRoute);
vi.stubGlobal('useI18n', () => ({ t: (k: string) => k }));
vi.stubGlobal('useAnalytics', () => ({ trackAmbiguousSearch: vi.fn() }));

const mockAdzuna = {
  fetchJobs: vi.fn(),
  fetchHistogram: vi.fn(),
  cachedGovIdCode: { value: null },
  jobsData: { value: null },
  histogramTotalCount: { value: 0 },
  histogramBuckets: { value: [] },
  histogramRange: { value: {} },
  histogramMaxCount: { value: 0 },
  meanSalary: { value: 0 },
  jobsCount: { value: 0 },
  loading: { value: false },
  isUnderpaid: { value: false },
  hasJobsData: { value: false }
};
vi.stubGlobal('useAdzuna', () => mockAdzuna);

const mockMarketData = {
  resolveUkIdentity: vi.fn(),
  resolveUsaIdentity: vi.fn(),
  matchedTitle: { value: '' },
  matchedIdCode: { value: '' },
  isGenericFallback: { value: false },
  resolving: { value: false }
};
vi.stubGlobal('useMarketData', () => mockMarketData);

const mockMacroData = {
  fetchMacroBaselines: vi.fn()
};
vi.stubGlobal('useMacroData', () => mockMacroData);

const mockMicroData = {
  fetchMicroBaselines: vi.fn()
};
vi.stubGlobal('useMicroData', () => mockMicroData);

vi.stubGlobal('useAsyncData', async (key: string, fetcher: Function) => {
  const data = await fetcher();
  return {
    data: { value: data },
    pending: { value: false },
    refresh: vi.fn()
  };
});

vi.stubGlobal('ref', (val: any) => {
  return {
    get value() { return val; },
    set value(v) { val = v; }
  };
});
vi.stubGlobal('computed', (fn: any) => ({ get value() { return fn(); } }));
vi.stubGlobal('watch', vi.fn());
vi.stubGlobal('navigateTo', vi.fn());
vi.stubGlobal('$fetch', vi.fn());

describe('useLocationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.query = {};
    mockRoute.params = { title: 'software-engineer', country: 'uk' };
    
    mockMarketData.matchedTitle.value = '';
    mockMarketData.matchedIdCode.value = '';
    mockMarketData.isGenericFallback.value = false;
    
    mockAdzuna.cachedGovIdCode.value = null;
    mockAdzuna.jobsData.value = null;
    mockAdzuna.histogramTotalCount.value = 0;
    
    mockMacroData.fetchMacroBaselines.mockResolvedValue({});
    mockMicroData.fetchMicroBaselines.mockResolvedValue({});
  });

  it('initializes and calls dependencies correctly for UK', async () => {
    const engine = await useLocationEngine('salary');
    
    expect(engine.displayTitle.value).toBe('Software Engineer');
    expect(engine.country.value).toBe('UK');
    expect(engine.currencySymbol.value).toBe('£');
    
    expect(mockAdzuna.fetchJobs).toHaveBeenCalled();
    expect(mockAdzuna.fetchHistogram).toHaveBeenCalled();
    expect(mockMarketData.resolveUkIdentity).toHaveBeenCalled();
    expect(mockMacroData.fetchMacroBaselines).toHaveBeenCalled();
    expect(mockMicroData.fetchMicroBaselines).toHaveBeenCalled();
  });

  it('initializes and calls dependencies correctly for USA', async () => {
    mockRoute.params = { title: 'teacher', country: 'usa' };
    
    const engine = await useLocationEngine('salary');
    
    expect(engine.country.value).toBe('USA');
    expect(engine.currencySymbol.value).toBe('$');
    expect(mockMarketData.resolveUsaIdentity).toHaveBeenCalled();
  });

  it('computes market average from micro national data p50', async () => {
    mockMicroData.fetchMicroBaselines.mockResolvedValueOnce({
      microNationalData: { p50: 50000 }
    });
    const engine = await useLocationEngine('salary');
    expect(engine.marketAverage.value).toBe(50000);
  });

  it('computes isUnderpaid correctly', async () => {
    mockRoute.query = { compare: '40000' };
    mockMicroData.fetchMicroBaselines.mockResolvedValueOnce({
      microNationalData: { p50: 50000 }
    });
    
    const engine = await useLocationEngine('salary');
    expect(engine.isUnderpaid.value).toBe(true);
  });
  
  it('computes not underpaid when salary is higher', async () => {
    mockRoute.query = { compare: '60000' };
    mockMicroData.fetchMicroBaselines.mockResolvedValueOnce({
      microNationalData: { p50: 50000 }
    });
    
    const engine = await useLocationEngine('salary');
    expect(engine.isUnderpaid.value).toBe(false);
  });
});
