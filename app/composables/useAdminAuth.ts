import { ref } from 'vue';
import { useFirebaseAuth } from 'vuefire';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

export const useAdminAuth = () => {
  const auth = useFirebaseAuth();
  const loading = ref(false);
  const error = ref('');

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
      error.value = 'The authentication service is not ready. Please refresh.';
      return false;
    }

    loading.value = true;
    error.value = '';

    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (e: any) {
      switch (e.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          error.value = 'The email or password entered is incorrect.';
          break;
        case 'auth/too-many-requests':
          error.value = 'Security lock: Too many failed attempts. Try again later.';
          break;
        default:
          error.value = 'An unexpected error occurred during sign in.';
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  return {
    login,
    logout,
    loading,
    error
  };
};
