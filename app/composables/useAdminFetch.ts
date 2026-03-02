import { useFirebaseAuth } from 'vuefire';
import { useRuntimeConfig, navigateTo } from '#imports';

export const useAdminFetch = () => {
  // 1. Grab context synchronously during component setup
  const config = useRuntimeConfig();
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();

  // 2. Return the actual fetch function to be used in click handlers
  return async <T>(request: string, opts?: any): Promise<T> => {
    let token = '';

    if (auth) {
      await auth.authStateReady();
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken(true);
      }
    }

    const options = {
      ...opts,
      headers: {
        ...opts?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    try {
      return await $fetch<T>(request, options);
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.warn('Session expired. Forcing client logout...');
        await logout();
        navigateTo({
          path: '/admin/login',
          query: { access: config.public.adminAccessKey }
        });
      }
      throw error;
    }
  };
};
