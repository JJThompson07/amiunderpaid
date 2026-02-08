/**
 * Middleware to protect admin routes.
 * It checks if the user is authenticated via Firebase.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = await getCurrentUser();

  // If the user is not logged in, redirect them to the login page
  if (!user) {
    return navigateTo({
      path: '/admin/login',
      query: {
        redirect: to.fullPath
      }
    });
  }
});
