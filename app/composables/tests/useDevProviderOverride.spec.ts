import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDevProviderOverride } from '../useDevProviderOverride';

const stateCache: Record<string, any> = {};
vi.stubGlobal('useState', (key: string, init: any) => {
  if (!(key in stateCache)) {
    stateCache[key] = { value: init ? init() : null };
  }
  return stateCache[key];
});

describe('useDevProviderOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(stateCache).forEach((key) => delete stateCache[key]);
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
