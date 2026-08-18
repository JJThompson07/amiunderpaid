import type { CookieOptions } from '#app';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevProviderOverride } from '../useDevProviderOverride';

type FakeCookieRef = { value: string | null };

const cookieCache = new Map<string, FakeCookieRef>();
vi.stubGlobal('useCookie', (key: string, options?: CookieOptions<string>) => {
  if (!cookieCache.has(key)) {
    cookieCache.set(key, { value: options?.default ? (options.default() as string) : null });
  }
  return cookieCache.get(key);
});

describe('useDevProviderOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieCache.clear();
  });

  it('initializes to auto', () => {
    const override = useDevProviderOverride();
    expect(override.value).toBe('auto');
  });

  it('updates the state', () => {
    const override = useDevProviderOverride();
    override.value = 'reed';

    const checkOverride = useDevProviderOverride();
    expect(checkOverride.value).toBe('reed');
  });
});
