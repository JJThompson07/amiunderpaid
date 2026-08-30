import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type AcceptHandler = (event: H3Event) => Promise<{ success: boolean }>;

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

const mockUseAdminApp = vi.fn(() => ({}));
vi.stubGlobal('useAdminApp', mockUseAdminApp);

let mockConfig: { public: { siteUrl?: string } };
vi.stubGlobal('useRuntimeConfig', () => mockConfig);

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

const mockCreateUser = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ createUser: mockCreateUser }))
}));

describe('admin recruiters/accept endpoint', () => {
  let handler: AcceptHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../accept.post');
    handler = mod.default as unknown as AcceptHandler;

    mockVerifyAdmin.mockResolvedValue(undefined);
    mockReadBody.mockResolvedValue({ uid: 'rec_1' });
    mockConfig = { public: { siteUrl: 'https://amiunderpaid.co.uk' } };
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'requested', email: 'rec@example.com', agency_name: 'Acme' })
    });
    mockDocUpdate.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue(undefined);
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

  it('rejects approving a recruiter not in requested status', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ status: 'active' }) });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Cannot approve request in status: active');
  });

  it('creates the auth user, activates the profile, and queues a welcome email', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'rec_1', email: 'rec@example.com', emailVerified: true })
    );
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', requiresPasswordChange: true })
    );
    expect(mockMailAdd).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'rec@example.com' })
    );
  });

  it('reports an unknown status when the recruiter has no status field', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Cannot approve request in status: unknown');
  });

  it('falls back to the default site URL and a generic greeting when agency_name/siteUrl are missing', async () => {
    mockConfig = { public: {} };
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ status: 'requested', email: 'rec@example.com' })
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockMailAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          html: expect.stringContaining('https://amiunderpaid.co.uk/recruiter/login'),
          text: expect.stringContaining('Hi there,')
        })
      })
    );
  });

  it('wraps a non-Error, non-H3 failure in an opaque 500', async () => {
    mockMailAdd.mockRejectedValueOnce('smtp down');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to approve recruiter.');
  });

  it('rethrows an H3 error unmodified', async () => {
    mockCreateUser.mockRejectedValueOnce(
      Object.assign(new Error('email exists'), { statusCode: 409 })
    );
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('email exists');
  });
});
