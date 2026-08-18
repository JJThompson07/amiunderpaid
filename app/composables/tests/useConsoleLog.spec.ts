import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import { useConsoleLog } from '../useConsoleLog';

describe('useConsoleLog', () => {
  it('initializes without throwing', () => {
    // This is a basic sanity test to ensure the composable can be instantiated.
    // Further specific business logic tests should be added here.
    expect(() => useConsoleLog()).not.toThrow();
  });

  it('appends messages and scrolls to bottom if consoleRef is available', async () => {
    const { status, consoleRef, log } = useConsoleLog();
    consoleRef.value = { scrollTop: 0, scrollHeight: 100 } as unknown as HTMLElement;

    log('test message');
    await nextTick();

    expect(status.value).toContain('> test message\n');
    expect(consoleRef.value?.scrollTop).toBe(100);
  });

  it('appends messages safely when consoleRef is null', async () => {
    const { status, consoleRef, log } = useConsoleLog();
    consoleRef.value = null;

    log('another message');
    await nextTick();

    expect(status.value).toContain('> another message\n');
  });

  it('clears log', () => {
    const { status, clearLog } = useConsoleLog();
    status.value = 'some existing logs';

    clearLog();

    expect(status.value).toBe('');
  });
});
