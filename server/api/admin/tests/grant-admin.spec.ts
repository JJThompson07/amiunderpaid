import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type GrantAdminHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockUseAdminApp = vi.fn(() => ({}));
vi.stubGlobal('useAdminApp', mockUseAdminApp);

const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockUseAdminFirestore = vi.fn(() => ({ collection: mockCollection }));
vi.stubGlobal('useAdminFirestore', mockUseAdminFirestore);

const mockSetCustomUserClaims = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ setCustomUserClaims: mockSetCustomUserClaims }))
}));

describe('admin grant-admin endpoint', () => {
  let handler: GrantAdminHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../grant-admin.post');
    handler = mod.default as unknown as GrantAdminHandler;

    mockReadBody.mockResolvedValue({ uid: 'user_123' });
    mockSetCustomUserClaims.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
  });

  it('requires a valid string uid', async () => {
    mockReadBody.mockResolvedValue({ uid: 123 });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('A valid uid is required to grant admin access.');
  });

  it('sets the admin custom claim and updates the Firestore role', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user_123', { admin: true });
    expect(mockDoc).toHaveBeenCalledWith('user_123');
    expect(mockSet).toHaveBeenCalledWith({ role: 'admin' }, { merge: true });
  });

  it('wraps an auth provisioning failure in an opaque 500', async () => {
    mockSetCustomUserClaims.mockRejectedValueOnce(new Error('auth down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to provision admin access.');
  });
});
