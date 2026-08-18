import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

const getFirebaseErrorCode = (e: unknown): string | undefined =>
  typeof e === 'object' && e !== null && 'code' in e ? (e as { code: string }).code : undefined;

export const useRecruiterAuth = (): {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  resendVerificationEmail: () => Promise<boolean>;
  loading: Ref<boolean>;
  error: Ref<string>;
} => {
  const auth = useFirebaseAuth();
  const { t } = useI18n();
  const { showToast } = useSystemToast();

  const loading = ref(false);
  const error = ref('');

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
      error.value = t('auth.errors.service_not_ready');
      return false;
    }

    loading.value = true;
    error.value = '';

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Wait for nuxt-vuefire's background fetch to mint the __session cookie
      await new Promise((resolve) => setTimeout(resolve, 800));

      return true;
    } catch (e) {
      const code = getFirebaseErrorCode(e);
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          error.value = t('auth.errors.invalid_credentials');
          break;
        case 'auth/too-many-requests':
          error.value = t('auth.errors.too_many_requests');
          break;
        default:
          error.value = t('auth.errors.unexpected_signin_error');
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    if (auth) {
      await signOut(auth);

      // Explicitly clear the stale cookie from the browser
      const sessionCookie = useCookie('__session');
      sessionCookie.value = null;

      // Give the background request time to destroy the HttpOnly cookie
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Kick them out!
      await navigateTo('/recruiter/login');
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    loading.value = true;
    error.value = '';

    if (!auth) {
      error.value = t('auth.errors.service_not_ready');
      loading.value = false;
      return false;
    }

    try {
      // This sends the standard Firebase reset email
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console -- surfaces password-reset failures for debugging; no dedicated error-logging utility exists in the composables layer yet
      console.error('Password reset error:', err);
      // Map Firebase errors to user-friendly messages
      const code = getFirebaseErrorCode(err);
      if (code === 'auth/user-not-found') {
        error.value = t('auth.errors.user_not_found');
      } else if (code === 'auth/invalid-email') {
        error.value = t('auth.errors.invalid_email');
      } else {
        error.value = t('auth.errors.reset_failed');
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const resendVerificationEmail = async (): Promise<boolean> => {
    if (!auth || !auth.currentUser) {
      return false;
    }

    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console -- surfaces verification-email failures for debugging; no dedicated error-logging utility exists in the composables layer yet
      console.error('Failed to resend verification:', err);
      // Optional: Handle Firebase's "too-many-requests" error if they spam the button
      if (getFirebaseErrorCode(err) === 'auth/too-many-requests') {
        showToast('Error', t('auth.errors.wait_before_resend'), 'error');
      }
      return false;
    }
  };

  return {
    login,
    logout,
    resetPassword,
    resendVerificationEmail,
    loading,
    error
  };
};
