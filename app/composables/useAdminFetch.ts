import { useFirebaseAuth, useCurrentUser } from 'vuefire';

export const useAdminFetch = () => {
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();
  const user = useCurrentUser();

  return async <T = unknown>(
    request: Parameters<typeof $fetch>[0],
    opts?: Parameters<typeof $fetch>[1]
  ): Promise<T> => {
    let token = '';

    if (auth) {
      await auth.authStateReady();
      if (user.value) {
        token = await user.value.getIdToken(true);
      }
    }

    try {
      // 👇 The Fix: Explicitly cast the final response as unknown, then T
      const response = await $fetch(request, {
        ...opts,
        headers: {
          ...opts?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      } as any);

      return response as unknown as T;
    } catch (error: any) {
      if (error.response?.status === 401 || error.statusCode === 401) {
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
