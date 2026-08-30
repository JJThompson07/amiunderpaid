import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';

type MatchTitleHandler = (
  event: H3Event
) => Promise<{ success: boolean; matches: { id_code: string; group_name: string }[] }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: { statusCode?: number; message?: string }) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const getQueryMock = vi.fn();
vi.stubGlobal('getQuery', getQueryMock);

const mockGet = vi.fn();
const mockWhere = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('engine match-title endpoint', () => {
  let handler: MatchTitleHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../match-title.get');
    handler = mod.default as unknown as MatchTitleHandler;

    getQueryMock.mockReturnValue({ title: 'Software Engineer', country: 'UK' });
    mockGet.mockResolvedValue({ empty: false, docs: [{ id: 'soc_1', data: () => ({ group_name: 'Engineers' }) }] });
  });

  it('returns success: false with no matches when title is missing', async () => {
    getQueryMock.mockReturnValue({});
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false, matches: [] });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('queries the uk_job_groups collection by default', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('uk_job_groups');
    expect(mockWhere).toHaveBeenCalledWith('titles', 'array-contains', 'software engineer');
    expect(res).toEqual({ success: true, matches: [{ id_code: 'soc_1', group_name: 'Engineers' }] });
  });

  it('queries the usa_job_groups collection when country is USA', async () => {
    getQueryMock.mockReturnValue({ title: 'Engineer', country: 'USA' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('usa_job_groups');
  });

  it('returns an empty match list when the snapshot is empty', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, matches: [] });
  });

  it('wraps a Firestore failure in a 500', async () => {
    mockGet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to match title');
  });
});
