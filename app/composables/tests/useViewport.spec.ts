import { describe, expect, it, vi } from 'vitest';

import { useViewport } from '../useViewport';

vi.stubGlobal('useWindowSize', () => ({ value: null, data: { value: null }, pending: { value: false }, error: { value: null }, execute: vi.fn(), loading: { value: false }, useWindowSize: vi.fn() }));
vi.stubGlobal('computed', (fn: any) => ({ get value() { return fn(); } }));

describe('useViewport', () => {
  it('initializes without throwing', () => {
    // This is a basic sanity test to ensure the composable can be instantiated.
    // Further specific business logic tests should be added here.
    expect(() => useViewport()).not.toThrow();
  });
});
