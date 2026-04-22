import { useFirebaseAuth, useCurrentUser } from 'vuefire';

export const useAdminFetch = () => {
  // 1. Grab context synchronously during component setup
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();
  const user = useCurrentUser();

  // 2. Return the actual fetch function to be used in click handlers
  return async <T>(request: string, opts?: any): Promise<T> => {
    let token = '';

    if (auth) {
      await auth.authStateReady();
      if (user.value) {
        token = await user.value.getIdToken(true);
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
          path: '/admin/login'
        });
      }
      throw error;
    }
  };
};
