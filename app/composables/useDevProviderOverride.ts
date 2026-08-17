export const useDevProviderOverride = () => {
  return useCookie<string>('devProviderOverride', { default: () => 'auto' });
};
