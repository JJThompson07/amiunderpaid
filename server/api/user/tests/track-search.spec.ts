import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
type TrackSearchHandler = (
  event: H3Event
) => Promise<{ success: boolean; id?: string; token?: string; error?: string }>;

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'server-timestamp')
  }
}));

const mockAdd = vi.fn();
const mockAdminFirestore = vi.fn(() => ({
  collection: vi.fn(() => ({ add: mockAdd }))
}));
vi.stubGlobal('useAdminFirestore', mockAdminFirestore);

const mockGenerateSearchToken = vi.fn(() => 'generated-token');
vi.stubGlobal('generateSearchToken', mockGenerateSearchToken);

let mockConfig: { searchTokenSecret?: string };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);
vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

describe('track-search endpoint', () => {
  let handler: TrackSearchHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../track-search.post');
    handler = mod.default as unknown as TrackSearchHandler;

    mockConfig = { searchTokenSecret: 'test-secret' };
    mockAdd.mockResolvedValue({ id: 'doc_123' });
    mockReadBody.mockResolvedValue({ title: 'Engineer', country: 'GB' });
  });

  it('fails closed with a 500 when searchTokenSecret is not configured', async () => {
    mockConfig = {};
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Server misconfiguration.');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('mints a token using the dedicated searchTokenSecret on success', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, id: 'doc_123', token: 'generated-token' });
    expect(mockGenerateSearchToken).toHaveBeenCalledWith('doc_123', 'test-secret');
  });

  it('normalizes every optional field when provided', async () => {
    mockReadBody.mockResolvedValue({
      title: 'Software Engineer',
      country: 'gb',
      location: 'London',
      salary: '50000',
      schedule: 'Full-Time',
      contract: 'Permanent',
      brand: 'AmIUnderpaid'
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, id: 'doc_123', token: 'generated-token' });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'software engineer',
        country: 'GB',
        location: 'london',
        salary: 50000,
        schedule: 'full-time',
        contract: 'permanent',
        brand: 'AmIUnderpaid'
      })
    );
  });

  it('returns success: false when required fields are missing', async () => {
    mockReadBody.mockResolvedValue({ title: '', country: '' });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false, error: 'Missing required fields' });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('silently returns success: false if the Firestore write fails', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Firestore is down'));
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false });
  });
});
