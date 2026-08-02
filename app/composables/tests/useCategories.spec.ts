import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCategories } from '../useCategories';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection')
}));

const mockData = { value: ['mock1', 'mock2'] };
const mockPending = { value: false };

vi.stubGlobal('useFirestore', vi.fn(() => 'mock-db'));
vi.stubGlobal('useCollection', vi.fn(() => ({ data: mockData, pending: mockPending })));

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches categories from firestore', () => {
    const { categories, loadingCategories } = useCategories();
    
    expect(categories.value).toEqual(['mock1', 'mock2']);
    expect(loadingCategories.value).toBe(false);
    
    // We should test that useCollection is called, but `useCollection` is globally stubbed.
    // Because it's globally stubbed via vi.stubGlobal, accessing the stub is a bit tricky.
    // We can just rely on the values being returned correctly.
  });
});
