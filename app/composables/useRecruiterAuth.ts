import { ref } from 'vue';
import { useFirebaseAuth, useFirebaseApp } from 'vuefire'; // <-- Changed here
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore'; // <-- Added getFirestore
import { useCookie } from '#imports';

export const useRecruiterAuth = () => {
  const auth = useFirebaseAuth();
  const firebaseApp = useFirebaseApp(); // Explicitly grab the Nuxt-initialized app
  const db = getFirestore(firebaseApp); // Bind Firestore to this exact app instance!

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

      // Wait for nuxt-vuefire's background fetch to mint the __session cookie
      await new Promise((resolve) => setTimeout(resolve, 800));

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

  const signup = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
      error.value = 'The authentication service is not ready. Please refresh.';
      return false;
    }

    loading.value = true;
    error.value = '';

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. IMMEDIATELY create their database record with the role 'recruiter'
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: 'recruiter', // Identify them!
        created_at: new Date().toISOString(),
        onboarding_complete: false // Flag to force them to pick a territory next
      });

      // Same fix as login: Wait for the session cookie to mint
      await new Promise((resolve) => setTimeout(resolve, 800));

      // trigger email verification
      await sendEmailVerification(userCredential.user);

      return true;
    } catch (e: any) {
      // Handle Sign-Up specific error codes
      switch (e.code) {
        case 'auth/email-already-in-use':
          error.value = 'An account with this email already exists. Try logging in instead.';
          break;
        case 'auth/weak-password':
          error.value = 'Your password must be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          error.value = 'Please enter a valid email address.';
          break;
        default:
          error.value = 'An unexpected error occurred during account creation.';
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);

      // Explicitly clear the stale cookie from the browser
      const sessionCookie = useCookie('__session');
      sessionCookie.value = null;

      // Give the background request time to destroy the HttpOnly cookie
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Kick them out!
      await navigateTo('/recruiter/login');
    }
  };

  const resetPassword = async (email: string) => {
    loading.value = true;
    error.value = '';

    if (!auth) {
      error.value = 'Authentication service is unavailable.';
      loading.value = false;
      return false;
    }

    try {
      // This sends the standard Firebase reset email
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (err: any) {
      console.error('Password reset error:', err);
      // Map Firebase errors to user-friendly messages
      if (err.code === 'auth/user-not-found') {
        error.value = 'No account found with that email address.';
      } else if (err.code === 'auth/invalid-email') {
        error.value = 'Please enter a valid email address.';
      } else {
        error.value = 'Failed to send reset email. Please try again later.';
      }
      return false;
    } finally {
      loading.value = false;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth || !auth.currentUser) {
      return false;
    }

    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err: any) {
      console.error('Failed to resend verification:', err);
      // Optional: Handle Firebase's "too-many-requests" error if they spam the button
      if (err.code === 'auth/too-many-requests') {
        alert('Please wait a few minutes before requesting another email.');
      }
      return false;
    }
  };

  return {
    login,
    signup,
    logout,
    resetPassword,
    resendVerificationEmail,
    loading,
    error
  };
};
