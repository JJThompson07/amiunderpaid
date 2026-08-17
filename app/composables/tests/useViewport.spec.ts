import { describe, expect, it, vi } from 'vitest';

import { useViewport } from '../useViewport';

let mockWidth = 1000;
vi.mock('@vueuse/core', () => ({
  useWindowSize: vi.fn(() => ({
    width: {
      get value() {
        return mockWidth;
      }
    }
  }))
}));
vi.stubGlobal('computed', (fn: any) => ({
  get value() {
    return fn();
  }
}));

describe('useViewport', () => {
  it('initializes without throwing', () => {
    expect(() => useViewport()).not.toThrow();
  });

  it('correctly identifies mobile viewport', () => {
    mockWidth = 500;
    const { isMobile, isDesktop, isXl } = useViewport();
    expect(isMobile.value).toBe(true);
    expect(isDesktop.value).toBe(false);
    expect(isXl.value).toBe(false);
  });

  it('correctly identifies tablet viewport', () => {
    mockWidth = 800;
    const { isMobile, isDesktop, isXl } = useViewport();
    expect(isMobile.value).toBe(false);
    expect(isDesktop.value).toBe(false);
    expect(isXl.value).toBe(false);
  });

  it('correctly identifies desktop viewport', () => {
    mockWidth = 1100;
    const { isMobile, isDesktop, isXl } = useViewport();
    expect(isMobile.value).toBe(false);
    expect(isDesktop.value).toBe(true);
    expect(isXl.value).toBe(false);
  });

  it('correctly identifies xl viewport', () => {
    mockWidth = 1300;
    const { isMobile, isDesktop, isXl } = useViewport();
    expect(isMobile.value).toBe(false);
    expect(isDesktop.value).toBe(true);
    expect(isXl.value).toBe(true);
  });
});
