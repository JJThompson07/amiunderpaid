import { doc, type DocumentReference, updateDoc } from 'firebase/firestore';
import type { Ref } from 'vue';

import type { UserProfile } from '~~/shared/utils/types';

export const useUserProfile = (): {
  userProfile: Ref<UserProfile | undefined>;
  loadingProfile: Ref<boolean>;
  // Firestore updates are a dynamic partial payload (any subset of profile fields,
  // including ones not yet modelled on UserProfile) — kept as Record<string, unknown>
  // rather than Partial<UserProfile> so callers aren't artificially constrained.
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
} => {
  const db = useFirestore();
  const user = useCurrentUser();

  // 1. Fetch live profile
  const userDocRef = computed(() =>
    user.value ? (doc(db, 'users', user.value.uid) as DocumentReference<UserProfile>) : null
  );
  const { data: userProfile, pending: loadingProfile } = useDocument(userDocRef);

  // 2. Reusable update method
  const updateProfile = async (data: Record<string, unknown>): Promise<void> => {
    if (!user.value) {
      throw new Error('User is not authenticated.');
    }

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
