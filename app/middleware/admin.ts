/**
 * Middleware to protect admin routes.
 * It checks if the user is authenticated via Firebase.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = await getCurrentUser();

  // If the user is not logged in, redirect them to the login page
  if (!user) {
    // SSR FALLBACK: If we are on the server and the browser sent a __session cookie,
    // Vuefire might just be failing to decode it. Let the request through and allow
    // the client-side Firebase SDK to securely verify the user upon hydration.
    if (import.meta.server && useCookie('__session').value) {
      return;
    }

    return navigateTo({
      path: '/admin/login',
      query: {
        redirect: to.fullPath,
        access: to.query.access
      }
    });
  }
});
