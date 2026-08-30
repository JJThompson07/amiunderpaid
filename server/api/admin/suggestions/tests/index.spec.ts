import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error } from 'h3';

type SuggestionsHandler = () => Promise<{
  success: boolean;
  suggestions: Record<string, unknown>[];
}>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

const mockGet = vi.fn();
const mockWhere = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('admin suggestions listing endpoint', () => {
  let handler: SuggestionsHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../index.get');
    handler = mod.default as unknown as SuggestionsHandler;
  });

  it('returns pending suggestions with their document id', async () => {
    mockGet.mockResolvedValue({
      docs: [{ id: 'sugg_1', data: () => ({ searchTerm: 'Senior Dev', count: 3 }) }]
    });

    const res = await handler();

    expect(res).toEqual({
      success: true,
      suggestions: [{ id: 'sugg_1', searchTerm: 'Senior Dev', count: 3 }]
    });
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockGet.mockRejectedValueOnce(new Error('firestore down'));

    await expect(handler()).rejects.toThrow('Failed to fetch suggestions');
  });
});
