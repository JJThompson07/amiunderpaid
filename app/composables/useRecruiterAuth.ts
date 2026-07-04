import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';

export const useRecruiterAuth = () => {
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
    } catch (e: any) {
      switch (e.code) {
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

  const logout = async () => {
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

  const resetPassword = async (email: string) => {
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
    } catch (err: any) {
      console.error('Password reset error:', err);
      // Map Firebase errors to user-friendly messages
      if (err.code === 'auth/user-not-found') {
        error.value = t('auth.errors.user_not_found');
      } else if (err.code === 'auth/invalid-email') {
        error.value = t('auth.errors.invalid_email');
      } else {
        error.value = t('auth.errors.reset_failed');
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth || !auth.currentUser) {
      return false;
    }

    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err: any) {
      console.error('Failed to resend verification:', err);
      // Optional: Handle Firebase's "too-many-requests" error if they spam the button
      if (err.code === 'auth/too-many-requests') {
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
