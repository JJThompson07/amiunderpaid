import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default defineNuxtRouteMiddleware(async (to) => {
  // 1. SSR FAST-PATH: Keep this at the very top!
  if (import.meta.server && useCookie('__session').value) {
    return;
  }

  // 2. CHECK AUTH: Are they logged in at all?
  const user = await getCurrentUser();
  if (!user) {
    return navigateTo({ path: '/recruiter/login', query: { redirect: to.fullPath } });
  }

  // 3. CHECK ROLE: Peek at their Firestore document
  const db = getFirestore(useFirebaseApp());
  const userDocSnap = await getDoc(doc(db, 'users', user.uid));

  const role = userDocSnap.data()?.role;

  // Allow both recruiters AND admins to view the Recruiter dashboard/matrix
  if (!userDocSnap.exists() || (role !== 'recruiter' && role !== 'admin')) {
    return navigateTo('/recruiter/login');
  }
});
