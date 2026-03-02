export const useAdminFetch = async <T>(request: string, opts?: any): Promise<T> => {
  const config = useRuntimeConfig();
  const { logout } = useAdminAuth(); // Use the composable we just made!

  try {
    return await $fetch<T>(request, opts);
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
