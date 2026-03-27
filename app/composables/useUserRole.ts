import { doc, getDoc } from 'firebase/firestore';
// Adjust your imports based on how you initialize Firebase/Vuefire
import { useCurrentUser, useFirestore } from 'vuefire';

export const useUserRole = () => {
  const user = useCurrentUser();
  const db = useFirestore();

  // Create a globally shared state for the role
  const userRole = useState<string | null>('userRole', () => null);
  const isRoleLoading = useState<boolean>('isRoleLoading', () => false);

  // Watch the auth state. When they log in, fetch their role.
  watch(
    user,
    async (newUser) => {
      if (newUser) {
        isRoleLoading.value = true;
        try {
          // Assuming you have a 'users' collection where the document ID matches the Auth UID
          const userDocRef = doc(db, 'users', newUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            // Grab the 'role' field (e.g., 'admin', 'recruiter')
            userRole.value = userSnap.data().role || 'user';
          } else {
            // Fallback if they don't have a document yet
            userRole.value = 'user';
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          userRole.value = 'user';
        } finally {
          isRoleLoading.value = false;
        }
      } else {
        // If they log out, wipe the role
        userRole.value = null;
      }
    },
    { immediate: true }
  ); // Run immediately on mount

  // Helper computed properties for your UI
  const isAdmin = computed(() => userRole.value === 'admin');
  const isRecruiter = computed(() => userRole.value === 'recruiter');
  const isStandardUser = computed(() => userRole.value === 'user');

  return {
    userRole,
    isRoleLoading,
    isAdmin,
    isRecruiter,
    isStandardUser
  };
};
