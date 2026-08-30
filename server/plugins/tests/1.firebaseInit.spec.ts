import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('defineNitroPlugin', <T extends () => void>(fn: T): T => fn);
vi.stubGlobal('createError', (err: { statusCode?: number; statusMessage?: string }) => {
  const e = new Error(err.statusMessage) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
const useAdminAppMock = vi.fn();
vi.stubGlobal('useAdminApp', useAdminAppMock);

const ORIGINAL_ENV = { ...process.env };

describe('server/plugins/1.firebaseInit', () => {
  let plugin: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!plugin) {
      const mod = await import('../1.firebaseInit');
      plugin = mod.default as unknown as () => void;
    }
    useAdminAppMock.mockReturnValue({ name: 'app' });
  });

  it('does nothing to env vars when FIREBASE_SERVICE_ACCOUNT_BASE64 is unset', () => {
    plugin();

    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(useAdminAppMock).toHaveBeenCalled();
  });

  it('decodes a valid base64 service account into GOOGLE_APPLICATION_CREDENTIALS', () => {
    const serviceAccount = { project_id: 'test-project' };
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(
      JSON.stringify(serviceAccount)
    ).toString('base64');

    plugin();

    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(JSON.stringify(serviceAccount));
  });

  it('leaves GOOGLE_APPLICATION_CREDENTIALS untouched when it is already set', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({ a: 1 })).toString(
      'base64'
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'already-set';

    plugin();

    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('already-set');
  });

  it('logs and continues when the base64 service account is not valid JSON', () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from('not-json').toString('base64');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => plugin()).not.toThrow();

    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '⚠️ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64',
      expect.any(Error)
    );
    expect(useAdminAppMock).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('wraps a useAdminApp initialization failure in a 500', () => {
    useAdminAppMock.mockImplementation(() => {
      throw new Error('bad credentials');
    });

    expect(() => plugin()).toThrow(
      'Server configuration error: Failed to initialize Firebase Admin.'
    );
  });
});
