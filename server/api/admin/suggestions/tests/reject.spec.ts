import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type RejectSuggestionHandler = (
  event: H3Event
) => Promise<{ success: boolean; message: string }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

let mockQuery: Record<string, string>;
vi.stubGlobal('getQuery', () => mockQuery);

const mockDelete = vi.fn();
const mockCollection = vi.fn(() => ({ doc: vi.fn(() => ({ delete: mockDelete })) }));
const mockUseAdminFirestore = vi.fn(() => ({ collection: mockCollection }));
vi.stubGlobal('useAdminFirestore', mockUseAdminFirestore);

describe('admin suggestions/reject endpoint', () => {
  let handler: RejectSuggestionHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../reject.delete');
    handler = mod.default as unknown as RejectSuggestionHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockQuery = { suggestionId: 'sugg_1' };
    mockDelete.mockResolvedValue(undefined);
  });

  it('requires a suggestionId', async () => {
    mockQuery = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Suggestion ID is required');
  });

  it('deletes the suggestion document', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, message: 'Suggestion rejected and deleted.' });
    expect(mockCollection).toHaveBeenCalledWith('job_suggestions');
  });

  it('wraps a Firestore delete failure in an opaque 500', async () => {
    mockDelete.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to delete suggestion');
  });

  it('wraps a non-Error throw with an "Unknown error" data message', async () => {
    mockDelete.mockRejectedValueOnce('a string rejection');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to delete suggestion');
  });
});
