import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import { usePricing } from '../usePricing';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.stubGlobal('useFirestore', () => 'mock-db');

vi.stubGlobal('useDocument', (_ref: any) => ({
  data: { value: { price: 10 } },
  pending: { value: false },
}));

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
    (doc as any).mockReturnValue('mock-doc-ref');
    
    const { pricingData, loadingPricing } = usePricing();
    
    expect(doc).toHaveBeenCalledWith('mock-db', 'platform_settings', 'pricing');
    expect(pricingData).toEqual({ value: { price: 10 } });
    expect(loadingPricing).toEqual({ value: false });
  });

  it('updates pricing successfully', async () => {
    (doc as any).mockReturnValue('mock-doc-ref');
    (setDoc as any).mockResolvedValue(undefined);

    const { updatePricing } = usePricing();
    const result = await updatePricing({ price: 20 });
    
    expect(result).toBe(true);
    expect(setDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      {
        price: 20,
        updatedAt: '2026-08-01T12:00:00.000Z'
      },
      { merge: true }
    );
  });

  it('throws error when update fails', async () => {
    (doc as any).mockReturnValue('mock-doc-ref');
    const mockError = new Error('Firestore error');
    (setDoc as any).mockRejectedValue(mockError);

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { updatePricing } = usePricing();
    await expect(updatePricing({ price: 20 })).rejects.toThrow('Firestore error');

    consoleSpy.mockRestore();
  });
});
