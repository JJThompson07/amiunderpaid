import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevProviderOverride } from '../useDevProviderOverride';

const cookieCache: Record<string, any> = {};
vi.stubGlobal('useCookie', (key: string, options: any) => {
  if (!(key in cookieCache)) {
    cookieCache[key] = { value: options?.default ? options.default() : null };
  }
  return cookieCache[key];
});

describe('useDevProviderOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(cookieCache).forEach((key) => delete cookieCache[key]);
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
