import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type RejectHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('isError', (e: unknown) => e instanceof Error && 'statusCode' in e);

const mockVerifyAdmin = vi.fn();
vi.stubGlobal('verifyAdmin', mockVerifyAdmin);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockDocGet = vi.fn();
const mockDocUpdate = vi.fn();
const mockMailAdd = vi.fn();
const mockCollection = vi.fn((name: string) => {
  if (name === 'mail') {
    return { add: mockMailAdd };
  }
  return { doc: vi.fn(() => ({ get: mockDocGet, update: mockDocUpdate })) };
});
const mockUseAdminFirestore = vi.fn(() => ({ collection: mockCollection }));
vi.stubGlobal('useAdminFirestore', mockUseAdminFirestore);

describe('admin recruiters/reject endpoint', () => {
  let handler: RejectHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../reject.post');
    handler = mod.default as unknown as RejectHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockReadBody.mockResolvedValue({ uid: 'rec_1' });
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'requested', email: 'rec@example.com', agency_name: 'Acme' })
    });
    mockDocUpdate.mockResolvedValue(undefined);
    mockMailAdd.mockResolvedValue(undefined);
  });

  it('requires a uid', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing UID');
  });

  it('404s when the recruiter document does not exist', async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Recruiter not found.');
  });

  it('rejects rejecting a recruiter not in requested status', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ status: 'active' }) });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Cannot reject request in status: active');
  });

  it('marks the recruiter rejected and notifies them by email', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockDocUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(mockMailAdd).toHaveBeenCalledWith(expect.objectContaining({ to: 'rec@example.com' }));
  });

  it('wraps a non-H3 failure in an opaque 500', async () => {
    mockDocUpdate.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('firestore down');
  });

  it('reports an unknown status when the recruiter has no status field', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Cannot reject request in status: unknown');
  });

  it('defaults to a generic greeting when agency_name is missing', async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'requested', email: 'rec@example.com' })
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockMailAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ text: expect.stringContaining('Hi there,') })
      })
    );
  });

  it('rethrows an H3 error unmodified', async () => {
    mockDocUpdate.mockRejectedValueOnce(Object.assign(new Error('conflict'), { statusCode: 409 }));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('conflict');
  });

  it('wraps a non-Error, non-H3 failure in an opaque 500', async () => {
    mockDocUpdate.mockRejectedValueOnce('smtp down');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to reject recruiter.');
  });
});
