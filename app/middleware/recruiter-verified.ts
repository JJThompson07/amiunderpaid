// middleware/requires-verification.ts

export default defineNuxtRouteMiddleware(async () => {
  // Grab the user (vuefire handles the auth state here automatically)
  const user = await getCurrentUser();

  // RULE 1: If they aren't logged in at all, kick to homepage
  if (!user) {
    return navigateTo('/');
  }

  // RULE 2: If they are logged in but NOT verified, kick to dashboard
  if (user && !user.emailVerified) {
    return navigateTo('/recruiter/dashboard');
  }
});
