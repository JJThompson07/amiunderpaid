import { useFirebaseAuth } from 'vuefire';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const useAdminAuth = () => {
  const auth = useFirebaseAuth();
  const loading = ref(false);
  const error = ref('');
  const { t } = useI18n();

  const login = async (email: string, password: string, accessKey: string): Promise<boolean> => {
    const config = useRuntimeConfig();

    if (accessKey !== config.public.adminAccessKey) {
      error.value = t('auth.errors.invalid_access_key');
      return false;
    }

    if (!auth) {
      error.value = t('auth.errors.service_not_ready');
      return false;
    }

    loading.value = true;
    error.value = '';

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // FIX: Wait for nuxt-vuefire's background fetch to mint the __session cookie
      // before we allow the router to navigate away and abort the request.
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
      await navigateTo('/');
    }
  };

  return {
    login,
    logout,
    loading,
    error
  };
};
