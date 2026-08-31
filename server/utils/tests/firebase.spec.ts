import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import type * as FirebaseUtils from '../firebase';

vi.stubGlobal('createError', (err: { statusCode?: number; statusMessage?: string }) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
const getHeaderMock = vi.fn();
vi.stubGlobal('getHeader', getHeaderMock);
const getCookieMock = vi.fn();
vi.stubGlobal('getCookie', getCookieMock);

const mockGetApps = vi.fn();
const mockInitializeApp = vi.fn();
const mockCert = vi.fn((serviceAccount: unknown) => ({ credentialFor: serviceAccount }));
vi.mock('firebase-admin/app', () => ({
  getApps: (...args: unknown[]): unknown => mockGetApps(...args),
  initializeApp: (...args: unknown[]): unknown => mockInitializeApp(...args),
  cert: (serviceAccount: unknown): unknown => mockCert(serviceAccount)
}));

const mockGetFirestore = vi.fn();
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: (...args: unknown[]): unknown => mockGetFirestore(...args)
}));

const mockVerifyIdToken = vi.fn();
const mockVerifySessionCookie = vi.fn();
const mockGetAuth = vi.fn(() => ({
  verifyIdToken: mockVerifyIdToken,
  verifySessionCookie: mockVerifySessionCookie
}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => mockGetAuth()
}));

const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn();
const makeCollectionRef = (): {
  where: typeof mockWhere;
  get: typeof mockGet;
  doc: typeof mockDoc;
} => {
  const ref = {
    where: mockWhere.mockImplementation(() => ref),
    get: mockGet,
    doc: mockDoc
  };
  return ref;
};
const mockCollection = vi.fn(() => makeCollectionRef());
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatch = vi.fn(() => ({
  set: mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit
}));

describe('server/utils/firebase', () => {
  let mod: typeof FirebaseUtils;

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!mod) {
      mod = await import('../firebase');
    }
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue({ name: 'initialized-app' });
    mockGetFirestore.mockReturnValue({ collection: mockCollection, batch: mockBatch });
    mockDoc.mockImplementation((id?: string) => ({ id: id || 'auto-id' }));
  });

  describe('useAdminApp', () => {
    it('reuses an already-initialized app instead of re-initializing', () => {
      mockGetApps.mockReturnValue([{ name: 'existing-app' }]);

      const app = mod.useAdminApp();

      expect(app).toEqual({ name: 'existing-app' });
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });

    it('initializes with no explicit credential when no service account env var is set', () => {
      const app = mod.useAdminApp();

      expect(mockInitializeApp).toHaveBeenCalledWith(undefined);
      expect(app).toEqual({ name: 'initialized-app' });
    });

    it('decodes and applies a base64-encoded service account when provided', () => {
      const serviceAccount = { project_id: 'test-project' };
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(
        JSON.stringify(serviceAccount)
      ).toString('base64');

      mod.useAdminApp();

      expect(mockCert).toHaveBeenCalledWith(serviceAccount);
      expect(mockInitializeApp).toHaveBeenCalledWith({
        credential: { credentialFor: serviceAccount }
      });
    });

    it('throws a 500 when the service account env var is not valid JSON', () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from('not-json').toString('base64');

      expect(() => mod.useAdminApp()).toThrow(
        'Server configuration error: Invalid Firebase credentials.'
      );
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });
  });

  describe('useAdminFirestore', () => {
    it('fetches Firestore for the admin app', () => {
      mockGetApps.mockReturnValue([{ name: 'existing-app' }]);

      mod.useAdminFirestore();

      expect(mockGetFirestore).toHaveBeenCalledWith({ name: 'existing-app' });
    });
  });

  describe('verifyAdmin', () => {
    const event = {} as unknown as H3Event;

    it('resolves when a valid Bearer token belongs to an admin', async () => {
      getHeaderMock.mockReturnValue('Bearer valid-token');
      mockVerifyIdToken.mockResolvedValue({ admin: true });

      await expect(mod.verifyAdmin(event)).resolves.toBeUndefined();
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('rejects a valid Bearer token belonging to a non-admin user with a 403', async () => {
      getHeaderMock.mockReturnValue('Bearer valid-token');
      mockVerifyIdToken.mockResolvedValue({ admin: false });

      await expect(mod.verifyAdmin(event)).rejects.toThrow('Forbidden: Admin access required');
    });

    it('falls back to the session cookie when there is no Authorization header', async () => {
      getHeaderMock.mockReturnValue(undefined);
      getCookieMock.mockReturnValue('session-cookie');
      mockVerifySessionCookie.mockResolvedValue({ admin: true });

      await expect(mod.verifyAdmin(event)).resolves.toBeUndefined();
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
      expect(mockVerifySessionCookie).toHaveBeenCalledWith('session-cookie', true);
    });

    it('falls back to the session cookie when the Bearer token fails verification', async () => {
      getHeaderMock.mockReturnValue('Bearer bad-token');
      mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));
      getCookieMock.mockReturnValue('session-cookie');
      mockVerifySessionCookie.mockResolvedValue({ admin: true });

      await expect(mod.verifyAdmin(event)).resolves.toBeUndefined();
    });

    it('rejects with a 401 when there is no Bearer token and no session cookie', async () => {
      getHeaderMock.mockReturnValue(undefined);
      getCookieMock.mockReturnValue(undefined);

      await expect(mod.verifyAdmin(event)).rejects.toThrow(
        'Unauthorized: No session cookie or token'
      );
    });

    it('rejects with a 401 using the underlying error message when the session cookie is invalid', async () => {
      getHeaderMock.mockReturnValue(undefined);
      getCookieMock.mockReturnValue('bad-cookie');
      mockVerifySessionCookie.mockRejectedValue(new Error('Session cookie has expired'));

      await expect(mod.verifyAdmin(event)).rejects.toThrow('Session cookie has expired');
    });

    it('falls back to a generic message when the rejected value has no message property', async () => {
      getHeaderMock.mockReturnValue(undefined);
      getCookieMock.mockReturnValue('bad-cookie');
      mockVerifySessionCookie.mockRejectedValue({});

      await expect(mod.verifyAdmin(event)).rejects.toThrow('Unauthorized: Invalid session');
    });
  });

  describe('batchDelete', () => {
    it('returns 0 without starting a batch when the query snapshot is empty', async () => {
      mockGet.mockResolvedValue({ empty: true, docs: [] });

      const count = await mod.batchDelete('leads', { status: 'archived' });

      expect(count).toBe(0);
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'archived');
      expect(mockBatch).not.toHaveBeenCalled();
    });

    it('deletes every matching document in a single batch when under the 500-doc chunk size', async () => {
      const docs = [{ ref: 'ref-1' }, { ref: 'ref-2' }];
      mockGet.mockResolvedValue({ empty: false, docs });

      const count = await mod.batchDelete('leads', { status: 'archived' });

      expect(count).toBe(2);
      expect(mockBatch).toHaveBeenCalledTimes(1);
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('splits deletion into multiple 500-doc batches for large result sets', async () => {
      const docs = Array.from({ length: 501 }, (_, i) => ({ ref: `ref-${i}` }));
      mockGet.mockResolvedValue({ empty: false, docs });

      const count = await mod.batchDelete('leads', {});

      expect(count).toBe(501);
      expect(mockBatch).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchSeed', () => {
    it('writes to an explicit doc id when objectID is provided, converting updatedAt to a Date', async () => {
      const count = await mod.batchSeed('search_index', [
        { objectID: 'doc_1', title: 'Engineer', updatedAt: '2026-01-01T00:00:00.000Z' }
      ]);

      expect(count).toBe(1);
      expect(mockDoc).toHaveBeenCalledWith('doc_1');
      const setCall = mockBatchSet.mock.calls[0]!;
      expect(setCall[0]).toEqual({ id: 'doc_1' });
      expect(setCall[1].title).toBe('Engineer');
      expect(setCall[1].updatedAt).toBeInstanceOf(Date);
    });

    it('generates an auto id and skips updatedAt conversion when objectID/updatedAt are absent', async () => {
      await mod.batchSeed('search_index', [{ title: 'Engineer' }]);

      expect(mockDoc).toHaveBeenCalledWith();
      const setCall = mockBatchSet.mock.calls[0]!;
      expect(setCall[1]).toEqual({ title: 'Engineer' });
    });

    it('splits seeding into multiple 500-item batches for large payloads', async () => {
      const items = Array.from({ length: 501 }, (_, i) => ({
        objectID: `doc_${i}`,
        title: `Job ${i}`
      }));

      const count = await mod.batchSeed('search_index', items);

      expect(count).toBe(501);
      expect(mockBatch).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });
  });
});
