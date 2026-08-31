import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type ApproveHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));
vi.stubGlobal('getHeader', () => 'Bearer admin-token');

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

const mockGroupSet = vi.fn();
const mockSuggestionUpdate = vi.fn();
const mockCollection = vi.fn((name: string) => {
  if (name === 'job_suggestions') {
    return { doc: vi.fn(() => ({ update: mockSuggestionUpdate })) };
  }
  return { doc: vi.fn(() => ({ set: mockGroupSet })) };
});
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection })),
  FieldValue: { arrayUnion: vi.fn((v: string) => `ARRAY_UNION(${v})`) }
}));

describe('admin suggestions/approve endpoint', () => {
  let handler: ApproveHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../approve.post');
    handler = mod.default as unknown as ApproveHandler;

    mockReadBody.mockResolvedValue({
      suggestionId: 'sugg_1',
      searchTerm: 'Senior Dev',
      targetIdCode: '2136',
      targetGroupName: 'Software Developers',
      country: 'UK'
    });
    mockGroupSet.mockResolvedValue(undefined);
    mockSuggestionUpdate.mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ success: true });
  });

  it('merges the suggested title into the UK job group and marks it approved', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockGroupSet).toHaveBeenCalledWith(
      { group_name: 'Software Developers', titles: 'ARRAY_UNION(senior dev)' },
      { merge: true }
    );
    expect(mockSuggestionUpdate).toHaveBeenCalledWith({ status: 'approved' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/job-groups/migrate',
      expect.objectContaining({ method: 'POST', body: { country: 'UK' } })
    );
  });

  it('routes US suggestions to the usa_job_groups collection', async () => {
    mockReadBody.mockResolvedValue({
      suggestionId: 'sugg_2',
      searchTerm: 'Data Engineer',
      targetIdCode: '15-1252',
      targetGroupName: 'Software Engineers',
      country: 'USA'
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('usa_job_groups');
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockGroupSet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Approval failed');
  });
});
