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
const mockContactSettingsGet = vi.fn();
const mockWhere = vi.fn(() => ({ get: mockUsersGet }));
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

const makeUserDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });

describe('user search/recruiter-card endpoint', () => {
  let handler: RecruiterCardHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../recruiter-card.get');
    handler = mod.default as unknown as RecruiterCardHandler;

    mockQuery = { territoryId: '5', category: 'engineering' };
    mockContactSettingsGet.mockResolvedValue({ exists: false });
  });

  it('rejects when territoryId or category is missing', async () => {
    mockQuery = { territoryId: '', category: '' };
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing territoryId or category');
  });

  it('returns no cards when the territory/category claim does not exist', async () => {
    mockClaimGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, cards: [] });
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
      expect.objectContaining({ recruiterId: 'owner_f', title: 'Base Title', agencyName: 'Base Agency' })
    );
  });
});
