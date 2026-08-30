import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type SuggestionHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockExistingGet = vi.fn();
const mockDocUpdate = vi.fn();
const mockAdd = vi.fn();
const mockDoc = vi.fn(() => ({ update: mockDocUpdate }));
const mockSuggestionsRef = {
  where: vi.fn(() => mockSuggestionsRef),
  get: mockExistingGet,
  add: mockAdd,
  doc: mockDoc
};
const mockCollection = vi.fn(() => mockSuggestionsRef);
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('user suggestion endpoint', () => {
  let handler: SuggestionHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../index.post');
    handler = mod.default as unknown as SuggestionHandler;

    mockReadBody.mockResolvedValue({
      search_term: '  Software Engineer  ',
      target_id_code: '2136',
      target_group_name: 'Programmers',
      country: 'uk'
    });
    mockExistingGet.mockResolvedValue({ empty: true, docs: [] });
    mockAdd.mockResolvedValue({ id: 'sugg_1' });
    mockDocUpdate.mockResolvedValue(undefined);
  });

  it('returns success: false when the search term or target_id_code is missing', async () => {
    mockReadBody.mockResolvedValue({ search_term: '', target_id_code: '' });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('creates a new pending suggestion, normalizing the search term and country', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        search_term: 'software engineer',
        country: 'UK',
        count: 1,
        status: 'pending'
      })
    );
  });

  it('recognizes US country aliases', async () => {
    mockReadBody.mockResolvedValue({
      search_term: 'engineer',
      target_id_code: '15-1252',
      country: 'USA'
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ country: 'USA' }));
  });

  it('increments the count on an existing pending suggestion instead of creating a new one', async () => {
    mockExistingGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing_sugg', data: () => ({ count: 4 }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockDocUpdate).toHaveBeenCalledWith({ count: 5 });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('defaults target_group_name to an empty string when omitted', async () => {
    mockReadBody.mockResolvedValue({ search_term: 'engineer', target_id_code: '2136' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ target_group_name: '' }));
  });

  it('returns success: false when Firestore throws', async () => {
    mockExistingGet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
  });
});
