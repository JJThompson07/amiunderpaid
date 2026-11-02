import type { FetchError } from 'ofetch';
import { useCurrentUser, useFirebaseAuth } from 'vuefire';

type AdminFetchOptions = Parameters<typeof $fetch>[1];

const statusOf = (error: unknown): number | undefined => {
  const fetchError = error as FetchError;
  return fetchError?.response?.status ?? fetchError?.statusCode;
};

export const useAdminFetch = () => {
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();
  const user = useCurrentUser();

  const getToken = async (forceRefresh: boolean): Promise<string> => {
    if (auth) {
      await auth.authStateReady();
    }
    return user.value ? await user.value.getIdToken(forceRefresh) : '';
  };

  const send = async <T>(
    request: Parameters<typeof $fetch>[0],
    opts: AdminFetchOptions,
    token: string
  ): Promise<T> => {
    const response = await $fetch(request, {
      ...opts,
      headers: {
        ...opts?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    } as AdminFetchOptions);

    return response as unknown as T;
  };

  return async <T = unknown>(
    request: Parameters<typeof $fetch>[0],
    opts?: AdminFetchOptions
  ): Promise<T> => {
    try {
      // the SDK's cached token (it refreshes itself near expiry), so chunked uploads don't hit
      // Google's token endpoint on every request
      const token = await getToken(false);
      try {
        return await send<T>(request, opts, token);
      } catch (error) {
        // verifyAdmin checks the `admin` custom claim, which a token minted before the claim was
        // granted won't carry: force one refresh and retry before treating it as forbidden
        if (token && statusOf(error) === 403) {
          return await send<T>(request, opts, await getToken(true));
        }
        throw error;
      }
    } catch (error) {
      if (statusOf(error) === 401) {
        await logout();
        navigateTo({
          path: '/admin/login'
        });
      }
      throw error;
    }
  };
};
