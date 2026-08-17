import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAuth } from '../useAdminAuth';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn()
}));

const mockNavigateTo = vi.fn();
const mockUseCookie = vi.fn(() => ({ value: null }));
const mockUseFirebaseAuth = vi.fn(() => ({ currentUser: {} })); // valid auth object
const mockUseI18n = vi.fn(() => ({ t: (key: string) => key }));
const mockUseRuntimeConfig = vi.fn(() => ({ public: { adminAccessKey: 'valid-key' } }));
const mockRef = vi.fn((val: any) => ({ value: val }));

vi.stubGlobal('navigateTo', mockNavigateTo);
vi.stubGlobal('useCookie', mockUseCookie);
vi.stubGlobal('useFirebaseAuth', mockUseFirebaseAuth);
vi.stubGlobal('useI18n', mockUseI18n);
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig);
vi.stubGlobal('ref', mockRef);

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails to login with invalid access key', async () => {
    const { login, error } = useAdminAuth();
    const result = await login('email', 'password', 'invalid-key');
    expect(result).toBe(false);
    expect(error.value).toBe('auth.errors.invalid_access_key');
  });

  it('fails to login when auth service is not ready', async () => {
    mockUseFirebaseAuth.mockReturnValueOnce(null as any);
    const { login, error } = useAdminAuth();
    const result = await login('email', 'password', 'valid-key');
    expect(result).toBe(false);
    expect(error.value).toBe('auth.errors.service_not_ready');
  });

  it('successfully logs in with valid credentials', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({} as any);
    const { login, loading, error } = useAdminAuth();
    const result = await login('email', 'password', 'valid-key');
    expect(result).toBe(true);
    expect(error.value).toBe('');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'email', 'password');
  });

  it('handles auth/invalid-credential error', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential'
    });
    const { login, error } = useAdminAuth();
    const result = await login('email', 'password', 'valid-key');
    expect(result).toBe(false);
    expect(error.value).toBe('auth.errors.invalid_credentials');
  });

  it('handles auth/too-many-requests error', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    const { login, error } = useAdminAuth();
    const result = await login('email', 'password', 'valid-key');
    expect(result).toBe(false);
    expect(error.value).toBe('auth.errors.too_many_requests');
  });

  it('handles unknown error', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/unknown-error' });
    const { login, error } = useAdminAuth();
    const result = await login('email', 'password', 'valid-key');
    expect(result).toBe(false);
    expect(error.value).toBe('auth.errors.unexpected_signin_error');
  });

  it('successfully logs out', async () => {
    const { logout } = useAdminAuth();
    await logout();
    expect(signOut).toHaveBeenCalled();
    expect(mockUseCookie).toHaveBeenCalledWith('__session');
    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });
});
