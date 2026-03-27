import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * Middleware to protect admin routes.
 * It checks if the user is authenticated via Firebase AND has the 'admin' role.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 1. SSR FAST-PATH: Trust the cookie on the server, let the client verify
  if (import.meta.server && useCookie('__session').value) {
    return;
  }

  // 2. CHECK AUTH: Are they logged in at all?
  const user = await getCurrentUser();

  if (!user) {
    return navigateTo({
      path: '/admin/login',
      query: {
        redirect: to.fullPath,
        access: to.query.access
      }
    });
  }

  // 3. CHECK ROLE: Peek at their Firestore document
  const db = getFirestore(useFirebaseApp());
  const userDocSnap = await getDoc(doc(db, 'users', user.uid));

  // If the document doesn't exist, OR the role isn't admin, kick them out!
  if (!userDocSnap.exists() || userDocSnap.data().role !== 'admin') {
    console.warn('Access Denied: User is not an admin');
    return navigateTo({
      path: '/admin/login',
      query: {
        redirect: to.fullPath,
        access: to.query.access
      }
    });
  }
});
