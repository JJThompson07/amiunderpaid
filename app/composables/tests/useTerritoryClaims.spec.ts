import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { useTerritoryClaims } from '../useTerritoryClaims';

// Mock Vue's ref and computed to use actual Vue functions so reactivity works
vi.stubGlobal('computed', computed);
vi.stubGlobal('ref', ref);

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, path) => `collection-${path}`),
  query: vi.fn((coll, condition) => ({ coll, condition })),
  where: vi.fn((field, op, value) => ({ field, op, value }))
}));

// Mock Nuxt auto-imports
const mockDb = 'mock-db';
vi.stubGlobal('useFirestore', () => mockDb);

// We need to control the returned values of useUserProfile and useCollection
const mockUserProfile = ref<{ uid: string } | null>(null);
vi.stubGlobal('useUserProfile', () => ({
  userProfile: mockUserProfile
}));

type MockTerritoryClaim = {
  territoryId: number;
  categoryValue: string;
  takenExclusiveMonths: Record<string, string>;
};
type MockQueryRef = { value: unknown };

const mockClaimsData = ref<MockTerritoryClaim[] | null>(null);
const mockPending = ref(false);
const useCollectionMock = vi.fn((_: MockQueryRef) => ({
  data: mockClaimsData,
  pending: mockPending
}));
vi.stubGlobal('useCollection', useCollectionMock);

describe('useTerritoryClaims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserProfile.value = { uid: 'current-user-123' };
    mockClaimsData.value = null;
    mockPending.value = false;
  });

  it('initializes without throwing', () => {
    const territoryIds = ref<number[]>([]);
    expect(() => useTerritoryClaims(territoryIds)).not.toThrow();
  });

  it('limits query to first 10 territoryIds and returns correct query', () => {
    // Variables removed because they are unused

    // Create an array of 12 ids
    const ids = Array.from({ length: 12 }, (_, i) => i + 1);
    const territoryIds = ref<number[]>(ids);

    // Call composable
    const { claimsLimitExceeded } = useTerritoryClaims(territoryIds);

    // useCollection is called with a computed. To evaluate it, we just access the computed value inside the mock
    // Wait, useCollection receives a computed Ref or getter.
    // The composable: const { data } = useCollection(claimsQuery);

    expect(claimsLimitExceeded.value).toBe(true);

    // We can evaluate the computed by checking what useCollection was called with
    const claimsQueryComputed = useCollectionMock.mock.calls[0]![0];
    const queryResult = claimsQueryComputed.value;

    expect(queryResult).toEqual({
      coll: 'collection-territory_category_owners',
      condition: {
        field: 'territoryId',
        op: 'in',
        value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Only first 10
      }
    });
  });

  it('returns null query and limits not exceeded when territoryIds is empty', () => {
    const territoryIds = ref<number[]>([]);
    const { claimsLimitExceeded } = useTerritoryClaims(territoryIds);

    expect(claimsLimitExceeded.value).toBe(false);

    const claimsQueryComputed = useCollectionMock.mock.calls[0]![0];

    expect(claimsQueryComputed.value).toBe(null);
  });

  it('calculates globalTakenMonths correctly locking only months owned by others', () => {
    const territoryIds = ref<number[]>([1, 2]);
    const { globalTakenMonths } = useTerritoryClaims(territoryIds);

    mockClaimsData.value = [
      {
        territoryId: 1,
        categoryValue: 'CatA',
        takenExclusiveMonths: {
          '2026-01': 'current-user-123', // Owned by me (should not be locked)
          '2026-02': 'other-user-456' // Owned by other (should be locked)
        }
      },
      {
        territoryId: 2,
        categoryValue: 'CatB',
        takenExclusiveMonths: {
          '2026-03': 'other-user-789'
        }
      }
    ];

    expect(globalTakenMonths.value).toEqual({
      '1|CatA': ['2026-02'],
      '2|CatB': ['2026-03']
    });
  });

  it('returns empty locks if no claimsData', () => {
    const territoryIds = ref<number[]>([1]);
    const { globalTakenMonths } = useTerritoryClaims(territoryIds);

    mockClaimsData.value = null;
    expect(globalTakenMonths.value).toEqual({});
  });

  it('returns empty locks if no userProfile', () => {
    const territoryIds = ref<number[]>([1]);
    const { globalTakenMonths } = useTerritoryClaims(territoryIds);

    mockUserProfile.value = null;
    mockClaimsData.value = [
      {
        territoryId: 1,
        categoryValue: 'CatA',
        takenExclusiveMonths: {
          '2026-01': 'other-user-456'
        }
      }
    ];

    expect(globalTakenMonths.value).toEqual({});
  });
});
