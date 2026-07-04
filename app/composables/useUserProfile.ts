import { doc, updateDoc } from 'firebase/firestore';

export const useUserProfile = () => {
  const db = useFirestore();
  const user = useCurrentUser();

  // 1. Fetch live profile
  const userDocRef = computed(() => (user.value ? doc(db, 'users', user.value.uid) : null));
  const { data: userProfile, pending: loadingProfile } = useDocument(userDocRef);

  // 2. Reusable update method
  const updateProfile = async (data: Record<string, any>) => {
    if (!user.value) throw new Error('User is not authenticated.');

    const ref = doc(db, 'users', user.value.uid);
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date()
    });
  };

  return {
    userProfile,
    loadingProfile,
    updateProfile
  };
};
