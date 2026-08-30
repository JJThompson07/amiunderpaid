import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type TitlePostHandler = (
  event: H3Event
) => Promise<{ success: boolean; message?: string }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockSet = vi.fn();
const mockCollection = vi.fn(() => ({ doc: vi.fn(() => ({ set: mockSet })) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection })),
  FieldValue: { arrayUnion: vi.fn((v: string) => `ARRAY_UNION(${v})`) }
}));

describe('admin job-groups/title (post) endpoint', () => {
  let handler: TitlePostHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../title.post');
    handler = mod.default as unknown as TitlePostHandler;

    mockReadBody.mockResolvedValue({ country: 'UK', idCode: '2136', newTitle: ' Senior Engineer ' });
    mockSet.mockResolvedValue(undefined);
  });

  it('returns success: false when idCode or newTitle is missing', async () => {
    mockReadBody.mockResolvedValue({ country: 'UK', idCode: '', newTitle: '' });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false, message: 'Missing fields' });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('normalizes and adds the new title to the UK collection', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockCollection).toHaveBeenCalledWith('uk_job_groups');
    expect(mockSet).toHaveBeenCalledWith(
      { titles: 'ARRAY_UNION(senior engineer)' },
      { merge: true }
    );
  });

  it('routes to the usa collection for USA', async () => {
    mockReadBody.mockResolvedValue({ country: 'USA', idCode: '15-1252', newTitle: 'Engineer' });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('usa_job_groups');
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockSet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to add title');
  });
});
