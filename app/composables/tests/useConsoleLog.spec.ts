import { describe, expect, it, vi } from 'vitest';

import { useConsoleLog } from '../useConsoleLog';

vi.stubGlobal('nextTick', async (fn: any) => { if (fn) {fn();} });
vi.stubGlobal('ref', (val: any) => ({ value: val }));

describe('useConsoleLog', () => {
  it('initializes without throwing', () => {
    // This is a basic sanity test to ensure the composable can be instantiated.
    // Further specific business logic tests should be added here.
    expect(() => useConsoleLog()).not.toThrow();
  });
});
