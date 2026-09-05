import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type RecruiterCardHandler = (
  event: H3Event
) => Promise<{ success: boolean; cards: Record<string, unknown>[] }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: { message?: string }) => new Error(err.message));

let mockQuery: Record<string, string>;
vi.stubGlobal('getQuery', () => mockQuery);

const mockClaimGet = vi.fn();
const mockUsersGet = vi.fn();
const mockNationalGet = vi.fn();
const mockContactSettingsGet = vi.fn();

// Spies for asserting exactly how the national-status query was built, since
// it's a dynamic field name (ukNationalStatus / usaNationalStatus) chosen at runtime.
const nationalQuerySpies = {
  flagWhere: vi.fn(),
  categoryWhere: vi.fn(),
  limit: vi.fn()
};
const inQuerySpy = vi.fn();

// The `users` collection is queried two different ways in this handler:
// 1. `.where(flag, '==', true).where('coveredCategories', 'array-contains', category).limit(10).get()`
// 2. `.where(FieldPath.documentId(), 'in', uids).get()` (FieldPath.documentId() is stubbed to 'documentId')
const mockWhere = vi.fn((field: unknown, op?: unknown, value?: unknown) => {
  if (field === 'documentId') {
    inQuerySpy(field, op, value);
    return { get: mockUsersGet };
  }
  nationalQuerySpies.flagWhere(field, op, value);
  return {
    where: vi.fn((field2: unknown, op2: unknown, value2: unknown) => {
      nationalQuerySpies.categoryWhere(field2, op2, value2);
      return {
        limit: vi.fn((n: number) => {
          nationalQuerySpies.limit(n);
          return { get: mockNationalGet };
        })
      };
    })
  };
});
const mockCollection = vi.fn((name: string) => {
  if (name === 'territory_category_owners') {
    return { doc: vi.fn(() => ({ get: mockClaimGet })) };
  }
  if (name === 'recruiter_contact_settings') {
    return { doc: vi.fn(() => ({ get: mockContactSettingsGet })) };
  }
  return { where: mockWhere };
});
vi.mock('firebase-admin/firestore', () => ({
  FieldPath: { documentId: vi.fn(() => 'documentId') },
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

const makeUserDoc = (
  id: string,
  data: Record<string, unknown>
): { id: string; data: () => Record<string, unknown> } => ({
  id,
  data: (): Record<string, unknown> => data
});

describe('user search/recruiter-card endpoint', () => {
  let handler: RecruiterCardHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../recruiter-card.get');
    handler = mod.default as unknown as RecruiterCardHandler;

    mockQuery = { territoryId: '5', category: 'engineering' };
    mockContactSettingsGet.mockResolvedValue({ exists: false });
    mockNationalGet.mockResolvedValue({ docs: [] });
  });

  it('rejects when territoryId, country, and category are all missing', async () => {
    mockQuery = { territoryId: '', category: '' };
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing territoryId/country or category');
  });

  it('rejects when category is missing even if territoryId is present', async () => {
    mockQuery = { territoryId: '5', category: '' };
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing territoryId/country or category');
  });

  it('returns no cards when the territory/category claim does not exist and no national recruiters cover it', async () => {
    mockClaimGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, cards: [] });
  });

  it('still yields national recruiters when there is no local claim doc at all', async () => {
    mockClaimGet.mockResolvedValue({ exists: false });
    mockNationalGet.mockResolvedValue({ docs: [makeUserDoc('national_1', {})] });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('national_1', { agency_name: 'National Recruiters Ltd' })]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards).toEqual([
      expect.objectContaining({ recruiterId: 'national_1', isExclusive: false })
    ]);
  });

  it('queries ukNationalStatus (active only) for a UK territoryId and usaNationalStatus for a USA territoryId', async () => {
    mockClaimGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    mockQuery = { territoryId: '5', category: 'engineering' };
    await handler(event);
    expect(nationalQuerySpies.flagWhere).toHaveBeenCalledWith('ukNationalStatus', '==', 'active');
    expect(nationalQuerySpies.categoryWhere).toHaveBeenCalledWith(
      'coveredCategories',
      'array-contains',
      'engineering'
    );
    expect(nationalQuerySpies.limit).toHaveBeenCalledWith(10);

    vi.clearAllMocks();
    mockClaimGet.mockResolvedValue({ exists: false });
    mockNationalGet.mockResolvedValue({ docs: [] });
    mockQuery = { territoryId: '210', category: 'engineering' };
    await handler(event);
    expect(nationalQuerySpies.flagWhere).toHaveBeenCalledWith('usaNationalStatus', '==', 'active');
  });

  it('falls back to a country-wide national lookup, skipping the local claim doc, when territoryId is absent', async () => {
    mockNationalGet.mockResolvedValue({ docs: [makeUserDoc('national_1', {})] });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('national_1', { agency_name: 'National Recruiters Ltd' })]
    });
    mockQuery = { country: 'UK', category: 'engineering' };
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(mockClaimGet).not.toHaveBeenCalled();
    expect(nationalQuerySpies.flagWhere).toHaveBeenCalledWith('ukNationalStatus', '==', 'active');
    expect(res.cards).toEqual([
      expect.objectContaining({ recruiterId: 'national_1', isExclusive: false })
    ]);
  });

  it('resolves usaNationalStatus for country=USA with no territoryId', async () => {
    mockNationalGet.mockResolvedValue({ docs: [] });
    mockQuery = { country: 'USA', category: 'engineering' };
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockClaimGet).not.toHaveBeenCalled();
    expect(nationalQuerySpies.flagWhere).toHaveBeenCalledWith('usaNationalStatus', '==', 'active');
  });

  it('merges national recruiters into the local basic-owner pool, deduping any overlap', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ basicOwners: ['owner_local', 'owner_both'] })
    });
    mockNationalGet.mockResolvedValue({
      docs: [makeUserDoc('owner_both', {}), makeUserDoc('owner_national', {})]
    });
    mockUsersGet.mockResolvedValue({ docs: [] });
    const event = {} as unknown as H3Event;

    await handler(event);

    const [, , selectedUids] = inQuerySpy.mock.calls[0] as [unknown, unknown, string[]];
    expect(new Set(selectedUids).size).toBe(selectedUids.length);
    expect(selectedUids.sort()).toEqual(['owner_both', 'owner_local', 'owner_national'].sort());
  });

  it('yields the local exclusive owner instead of national recruiters when one holds the current month', async () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ takenExclusiveMonths: { [currentMonthStr]: 'exclusive_owner' } })
    });
    mockNationalGet.mockResolvedValue({ docs: [makeUserDoc('national_1', {})] });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('exclusive_owner', {})]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards).toEqual([
      expect.objectContaining({ recruiterId: 'exclusive_owner', isExclusive: true })
    ]);
    const [, , selectedUids] = inQuerySpy.mock.calls[0] as [unknown, unknown, string[]];
    expect(selectedUids).toEqual(['exclusive_owner']);
  });

  it('returns no cards when there is no exclusive owner and no basic owners', async () => {
    mockClaimGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, cards: [] });
    expect(mockUsersGet).not.toHaveBeenCalled();
  });

  it('prioritises the exclusive owner and resolves settings from a stringified JSON field', async () => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({
        takenExclusiveMonths: { [currentMonthStr]: 'owner_1' },
        basicOwners: ['owner_2']
      })
    });
    mockUsersGet.mockResolvedValue({
      docs: [
        makeUserDoc('owner_1', {
          contactSettings: JSON.stringify({
            title: 'Hello',
            content: 'World',
            categoryContent: { engineering: 'Engineering copy' }
          })
        })
      ]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards).toEqual([
      expect.objectContaining({
        recruiterId: 'owner_1',
        isExclusive: true,
        title: 'Hello',
        content: 'World',
        categoryContent: 'Engineering copy',
        brandBgColour: '#4f46e5',
        brandTextColour: '#ffffff'
      })
    ]);
  });

  it('falls back to basic owners (up to 3), the dedicated settings collection, and snake_case field names', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ basicOwners: ['owner_a', 'owner_b', 'owner_c', 'owner_d'] })
    });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('owner_a', { agency_name: 'Acme' })]
    });
    mockContactSettingsGet.mockResolvedValue({
      exists: true,
      data: () => ({ contactTitle: 'Dedicated Title', brand_bg_colour: '#123456' })
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards[0]).toEqual(
      expect.objectContaining({
        recruiterId: 'owner_a',
        isExclusive: false,
        title: 'Dedicated Title',
        brandBgColour: '#123456',
        agencyName: 'Acme'
      })
    );
  });

  it('recovers gracefully from a malformed stringified contactSettings JSON', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ basicOwners: ['owner_e'] })
    });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('owner_e', { contactSettings: '{invalid json', title: 'Base Title' })]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards[0]).toEqual(expect.objectContaining({ recruiterId: 'owner_e', title: null }));
    expect(mockContactSettingsGet).not.toHaveBeenCalled();
  });

  it('falls back to the base user document when no settings exist anywhere', async () => {
    mockClaimGet.mockResolvedValue({
      exists: true,
      data: () => ({ basicOwners: ['owner_f'] })
    });
    mockUsersGet.mockResolvedValue({
      docs: [makeUserDoc('owner_f', { title: 'Base Title', agencyName: 'Base Agency' })]
    });
    mockContactSettingsGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.cards[0]).toEqual(
      expect.objectContaining({
        recruiterId: 'owner_f',
        title: 'Base Title',
        agencyName: 'Base Agency'
      })
    );
  });
});
