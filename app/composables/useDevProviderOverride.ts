import type { CookieRef } from '#app';

export const useDevProviderOverride = (): CookieRef<string> => {
  return useCookie<string>('devProviderOverride', { default: () => 'auto' });
};
