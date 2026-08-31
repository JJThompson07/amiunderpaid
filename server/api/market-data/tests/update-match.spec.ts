import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type UpdateMatchHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockAdd = vi.fn();
const mockDoc = vi.fn(() => ({ update: mockUpdate }));
const mockWhere = vi.fn(() => ({ where: mockWhere, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere, doc: mockDoc, add: mockAdd }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('market-data update-match endpoint', () => {
  let handler: UpdateMatchHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    mockWhere.mockImplementation(() => ({ where: mockWhere, get: mockGet }));
    const mod = await import('../update-match.post');
    handler = mod.default as unknown as UpdateMatchHandler;

    mockReadBody.mockResolvedValue({
      title: 'Engineer',
      gov_id_code: 'soc_123',
      gov_title: 'Software Engineers',
      country: 'UK'
    });
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    mockAdd.mockResolvedValue({ id: 'suggestion_1' });
    mockUpdate.mockResolvedValue(undefined);
  });

  it('returns success: false when title or gov_id_code is missing', async () => {
    mockReadBody.mockResolvedValue({ title: '', gov_id_code: '' });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('creates a new suggestion doc, normalizing the search term and mapping country to UK', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        search_term: 'engineer',
        target_id_code: 'soc_123',
        target_group_name: 'Software Engineers',
        country: 'UK',
        count: 1,
        status: 'pending'
      })
    );
  });

  it('maps US-style country aliases to USA', async () => {
    mockReadBody.mockResolvedValue({
      title: 'Engineer',
      gov_id_code: 'soc_123',
      country: 'us'
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ country: 'USA' }));
  });

  it('increments the count on an existing pending suggestion instead of creating a new one', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing_1', data: (): unknown => ({ count: 4 }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockDoc).toHaveBeenCalledWith('existing_1');
    expect(mockUpdate).toHaveBeenCalledWith({ count: 5 });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('defaults the existing count to 1 before incrementing when count is absent on the doc', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing_1', data: (): unknown => ({}) }]
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockUpdate).toHaveBeenCalledWith({ count: 2 });
  });

  it('silently returns success: false if the Firestore query fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Firestore is down'));
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
  });
});
