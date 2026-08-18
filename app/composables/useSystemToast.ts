// composables/useSystemToast.ts
import type { Ref } from 'vue';

export type SystemToastState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

export const useSystemToast = (): {
  toastState: Ref<SystemToastState>;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  closeToast: () => void;
} => {
  // useState ensures this is globally shared across your entire Nuxt app
  const toastState = useState<SystemToastState>('system-toast', () => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  }));

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ): void => {
    toastState.value = {
      isOpen: true,
      title,
      message,
      type
    };
  };

  const closeToast = (): void => {
    toastState.value.isOpen = false;
  };

  return {
    toastState,
    showToast,
    closeToast
  };
};
