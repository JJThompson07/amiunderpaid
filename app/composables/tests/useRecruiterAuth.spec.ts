import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserCredential } from 'firebase/auth';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { useRecruiterAuth } from '../useRecruiterAuth';

vi.mock('firebase/auth', () => ({
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn()
}));

const mockAuth = { currentUser: { uid: '123' } };
const mockUseFirebaseAuth = vi.fn((): { currentUser: { uid: string } | null } | null => mockAuth);
vi.stubGlobal('useFirebaseAuth', mockUseFirebaseAuth);
vi.stubGlobal('useI18n', () => ({ t: (k: string): string => k }));

const mockShowToast = vi.fn();
vi.stubGlobal('useSystemToast', () => ({ showToast: mockShowToast }));

const mockCookie = { value: 'session-token' as string | null };
vi.stubGlobal('useCookie', () => mockCookie);

vi.stubGlobal('ref', <T>(val: T) => ({ value: val }));
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

// `useFirebaseAuth` is a Nuxt auto-import stubbed onto globalThis per-test (not a real
// ambient global), so TypeScript has no declaration for it — this narrow cast reads back
// whichever stub the current test installed, matching the runtime dynamic-global pattern.
type RecruiterAuthGlobals = {
  useFirebaseAuth: () => { currentUser: { uid: string } | null } | null;
};
const getGlobalUseFirebaseAuth = (): RecruiterAuthGlobals['useFirebaseAuth'] =>
  (globalThis as unknown as RecruiterAuthGlobals).useFirebaseAuth;

describe('useRecruiterAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookie.value = 'session-token';
  });

  it('initializes and provides reactive state', () => {
    const { loading, error } = useRecruiterAuth();
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
  });

  describe('login', () => {
    it('successfully logs in', async () => {
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as unknown as UserCredential);
      const { login, loading } = useRecruiterAuth();

      const promise = login('test@test.com', 'password');
      expect(loading.value).toBe(true);

      const result = await promise;
      expect(result).toBe(true);
      expect(loading.value).toBe(false);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'test@test.com',
        'password'
      );
    });

    it('handles login errors', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/wrong-password' });
      const { login, error } = useRecruiterAuth();

      const result = await login('test@test.com', 'wrong');
      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.invalid_credentials');
    });
  });

  describe('logout', () => {
    it('logs out and clears session', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);
      const { logout } = useRecruiterAuth();

      await logout();

      expect(signOut).toHaveBeenCalledWith(mockAuth);
      expect(mockCookie.value).toBeNull();
      expect(mockNavigateTo).toHaveBeenCalledWith('/recruiter/login');
    });
  });

  describe('resetPassword', () => {
    it('sends password reset email', async () => {
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);
      const { resetPassword, loading } = useRecruiterAuth();

      const result = await resetPassword('test@test.com');

      expect(result).toBe(true);
      expect(loading.value).toBe(false);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'test@test.com');
    });

    it('handles reset errors', async () => {
      vi.mocked(sendPasswordResetEmail).mockRejectedValue({ code: 'auth/user-not-found' });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { resetPassword, error } = useRecruiterAuth();

      const result = await resetPassword('test@test.com');
      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.user_not_found');

      consoleSpy.mockRestore();
    });
  });

  describe('resendVerificationEmail', () => {
    it('resends verification email', async () => {
      vi.mocked(sendEmailVerification).mockResolvedValue(undefined);
      const { resendVerificationEmail } = useRecruiterAuth();

      const result = await resendVerificationEmail();

      expect(result).toBe(true);
      expect(sendEmailVerification).toHaveBeenCalledWith(mockAuth.currentUser);
    });

    it('handles too many requests error', async () => {
      vi.mocked(sendEmailVerification).mockRejectedValue({ code: 'auth/too-many-requests' });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { resendVerificationEmail } = useRecruiterAuth();

      const result = await resendVerificationEmail();
      expect(result).toBe(false);
      expect(mockShowToast).toHaveBeenCalledWith(
        'Error',
        'auth.errors.wait_before_resend',
        'error'
      );

      consoleSpy.mockRestore();
    });

    it('handles generic resend error', async () => {
      vi.mocked(sendEmailVerification).mockRejectedValue({ code: 'auth/generic-error' });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { resendVerificationEmail } = useRecruiterAuth();

      const result = await resendVerificationEmail();
      expect(result).toBe(false);

      consoleSpy.mockRestore();
    });

    it('returns false if no auth or no current user', async () => {
      const oldAuth = getGlobalUseFirebaseAuth()();
      vi.stubGlobal('useFirebaseAuth', () => null);

      const { resendVerificationEmail } = useRecruiterAuth();
      const result = await resendVerificationEmail();
      expect(result).toBe(false);

      vi.stubGlobal('useFirebaseAuth', () => ({ currentUser: null }));
      const { resendVerificationEmail: resend2 } = useRecruiterAuth();
      const result2 = await resend2();
      expect(result2).toBe(false);

      vi.stubGlobal('useFirebaseAuth', () => oldAuth);
    });
  });

  describe('Additional Error Branches', () => {
    it('handles login without auth', async () => {
      const oldAuth = getGlobalUseFirebaseAuth()();
      vi.stubGlobal('useFirebaseAuth', () => null);

      const { login, error } = useRecruiterAuth();
      const result = await login('a', 'b');

      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.service_not_ready');

      vi.stubGlobal('useFirebaseAuth', () => oldAuth);
    });

    it('handles login too-many-requests', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/too-many-requests' });
      const { login, error } = useRecruiterAuth();

      const result = await login('a', 'b');
      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.too_many_requests');
    });

    it('handles login unknown error', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/unknown' });
      const { login, error } = useRecruiterAuth();

      const result = await login('a', 'b');
      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.unexpected_signin_error');
    });

    it('handles resetPassword without auth', async () => {
      const oldAuth = getGlobalUseFirebaseAuth()();
      vi.stubGlobal('useFirebaseAuth', () => null);

      const { resetPassword, error } = useRecruiterAuth();
      const result = await resetPassword('a');

      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.service_not_ready');

      vi.stubGlobal('useFirebaseAuth', () => oldAuth);
    });

    it('handles resetPassword invalid-email', async () => {
      vi.mocked(sendPasswordResetEmail).mockRejectedValue({ code: 'auth/invalid-email' });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const { resetPassword, error } = useRecruiterAuth();
      const result = await resetPassword('a');

      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.invalid_email');
      consoleSpy.mockRestore();
    });

    it('handles resetPassword default error', async () => {
      vi.mocked(sendPasswordResetEmail).mockRejectedValue({ code: 'auth/unknown' });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const { resetPassword, error } = useRecruiterAuth();
      const result = await resetPassword('a');

      expect(result).toBe(false);
      expect(error.value).toBe('auth.errors.reset_failed');
      consoleSpy.mockRestore();
    });
  });
});
