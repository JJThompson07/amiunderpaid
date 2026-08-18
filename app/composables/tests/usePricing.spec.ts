import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import { usePricing } from '../usePricing';
import type { PricingBand, PricingConfig } from '../usePricing';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn()
}));

vi.stubGlobal('useFirestore', () => 'mock-db');

const mockBand = (basic: number, exclusive: number): PricingBand => ({ basic, exclusive });

const mockPricingConfig: PricingConfig = {
  UK: {
    band1: mockBand(100, 150),
    band2: mockBand(110, 160),
    band3: mockBand(120, 170),
    band4: mockBand(130, 180),
    band5: mockBand(140, 190)
  },
  USA: {
    band1: mockBand(200, 250),
    band2: mockBand(210, 260),
    band3: mockBand(220, 270),
    band4: mockBand(230, 280),
    band5: mockBand(240, 290)
  }
};

vi.stubGlobal('useDocument', (_: unknown) => ({
  data: { value: mockPricingConfig },
  pending: { value: false }
}));

const mockedDoc = vi.mocked(doc);
const mockedSetDoc = vi.mocked(setDoc);

describe('usePricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes and provides pricingData and loadingPricing', () => {
    mockedDoc.mockReturnValue('mock-doc-ref' as unknown as ReturnType<typeof doc>);

    const { pricingData, loadingPricing } = usePricing();

    expect(doc).toHaveBeenCalledWith('mock-db', 'platform_settings', 'pricing');
    expect(pricingData).toEqual({ value: mockPricingConfig });
    expect(loadingPricing).toEqual({ value: false });
  });

  it('updates pricing successfully', async () => {
    mockedDoc.mockReturnValue('mock-doc-ref' as unknown as ReturnType<typeof doc>);
    mockedSetDoc.mockResolvedValue(undefined);

    const { updatePricing } = usePricing();
    const result = await updatePricing({ UK: mockPricingConfig.UK });

    expect(result).toBe(true);
    expect(setDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      {
        UK: mockPricingConfig.UK,
        updatedAt: '2026-08-01T12:00:00.000Z'
      },
      { merge: true }
    );
  });

  it('throws error when update fails', async () => {
    mockedDoc.mockReturnValue('mock-doc-ref' as unknown as ReturnType<typeof doc>);
    const mockError = new Error('Firestore error');
    mockedSetDoc.mockRejectedValue(mockError);

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { updatePricing } = usePricing();
    await expect(updatePricing({ UK: mockPricingConfig.UK })).rejects.toThrow('Firestore error');

    consoleSpy.mockRestore();
  });
});
