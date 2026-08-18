import type { FetchError } from 'ofetch';
import { useCurrentUser, useFirebaseAuth } from 'vuefire';

type AdminFetchOptions = Parameters<typeof $fetch>[1];

export const useAdminFetch = () => {
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();
  const user = useCurrentUser();

  return async <T = unknown>(
    request: Parameters<typeof $fetch>[0],
    opts?: AdminFetchOptions
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
      } as AdminFetchOptions);

      return response as unknown as T;
    } catch (error) {
      const fetchError = error as FetchError;
      if (fetchError.response?.status === 401 || fetchError.statusCode === 401) {
        await logout();
        navigateTo({
          path: '/admin/login'
        });
      }
      throw error;
    }
  };
};
