import { useFirebaseAuth } from 'vuefire';

export const useAdminFetch = async <T>(request: string, opts?: any): Promise<T> => {
  const config = useRuntimeConfig();
  const { logout } = useAdminAuth();
  const auth = useFirebaseAuth();

  let token = '';

  if (auth) {
    // 1. THE MAGIC FIX: Wait for Firebase to fully load the user from local storage
    await auth.authStateReady();

    if (auth.currentUser) {
      // 2. Force refresh the token to ensure it hasn't expired
      token = await auth.currentUser.getIdToken(true);
    }
  }

  // 3. Attach the guaranteed fresh token
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
