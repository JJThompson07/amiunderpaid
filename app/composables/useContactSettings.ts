import type { Ref } from 'vue';
import { doc } from 'firebase/firestore';

export type RecruiterContactSettings = {
  title?: string;
  content?: string;
  buttonText?: string;
  brandBgColour?: string;
  brandTextColour?: string;
  logoUrl?: string;
  categoryContent?: Record<string, string>;
};

type UseContactSettingsReturn = {
  contactSettings: Ref<(RecruiterContactSettings & { id: string }) | null | undefined>;
  loadingSettings: Ref<boolean>;
};

export const useContactSettings = (): UseContactSettingsReturn => {
  const db = useFirestore();
  const user = useCurrentUser();

  // Fetch live contact settings from the dedicated collection
  const settingsDocRef = computed(() =>
    user.value ? doc(db, 'recruiter_contact_settings', user.value.uid) : null
  );
  const { data: contactSettings, pending: loadingSettings } =
    useDocument<RecruiterContactSettings>(settingsDocRef);

  return {
    contactSettings,
    loadingSettings
  };
};
