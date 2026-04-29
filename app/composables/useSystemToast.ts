// composables/useSystemToast.ts
export const useSystemToast = () => {
  // useState ensures this is globally shared across your entire Nuxt app
  const toastState = useState('system-toast', () => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  }));

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    toastState.value = {
      isOpen: true,
      title,
      message,
      type
    };
  };

  const closeToast = () => {
    toastState.value.isOpen = false;
  };

  return {
    toastState,
    showToast,
    closeToast
  };
};
