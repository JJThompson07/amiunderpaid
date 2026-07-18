import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSystemToast } from '../useSystemToast';

// Mock Nuxt auto-imports
let mockState: Record<string, any> = {};

vi.stubGlobal('useState', (key: string, init: () => any) => {
  if (!mockState[key]) {
    mockState[key] = { value: init() };
  }
  return mockState[key];
});

describe('useSystemToast composable', () => {
  beforeEach(() => {
    // Reset the mocked state before each test
    mockState = {};
  });

  it('initializes with default closed state', () => {
    const { toastState } = useSystemToast();
    expect(toastState.value.isOpen).toBe(false);
    expect(toastState.value.title).toBe('');
    expect(toastState.value.message).toBe('');
    expect(toastState.value.type).toBe('info');
  });

  it('showToast updates the state correctly', () => {
    const { toastState, showToast } = useSystemToast();
    showToast('Success!', 'Saved successfully', 'success');

    expect(toastState.value.isOpen).toBe(true);
    expect(toastState.value.title).toBe('Success!');
    expect(toastState.value.message).toBe('Saved successfully');
    expect(toastState.value.type).toBe('success');
  });

  it('showToast defaults to info type if not provided', () => {
    const { toastState, showToast } = useSystemToast();
    showToast('Hello', 'World');

    expect(toastState.value.isOpen).toBe(true);
    expect(toastState.value.type).toBe('info');
  });

  it('closeToast sets isOpen to false without clearing message', () => {
    const { toastState, showToast, closeToast } = useSystemToast();
    showToast('Error', 'Something went wrong', 'error');

    // State is open
    expect(toastState.value.isOpen).toBe(true);

    // Close it
    closeToast();

    expect(toastState.value.isOpen).toBe(false);
    // Title and message should still be there for out-animations
    expect(toastState.value.title).toBe('Error');
    expect(toastState.value.message).toBe('Something went wrong');
  });
});
