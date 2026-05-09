import { doc } from 'firebase/firestore';

export const useContactSettings = () => {
  const db = useFirestore();
  const user = useCurrentUser();

  // Fetch live contact settings from the dedicated collection
  const settingsDocRef = computed(() =>
    user.value ? doc(db, 'recruiter_contact_settings', user.value.uid) : null
  );
  const { data: contactSettings, pending: loadingSettings } = useDocument(settingsDocRef);

  return {
    contactSettings,
    loadingSettings
  };
};
