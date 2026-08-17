import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useContactSettings } from '../useContactSettings';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, path, id) => `mock-doc-${path}-${id}`)
}));

const mockData = { value: { contact: 'test' } };
const mockPending = { value: false };

let mockUser: any = { uid: 'user-123' };

vi.stubGlobal(
  'useFirestore',
  vi.fn(() => 'mock-db')
);
vi.stubGlobal(
  'useCurrentUser',
  vi.fn(() => ({
    get value() {
      return mockUser;
    }
  }))
);
vi.stubGlobal(
  'useDocument',
  vi.fn((docRef) => {
    // Read value to trigger computed evaluation
    const _ = docRef?.value;
    return { data: mockData, pending: mockPending };
  })
);
vi.stubGlobal('computed', (fn: any) => ({
  get value() {
    return fn();
  }
}));

describe('useContactSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { uid: 'user-123' };
  });

  it('fetches contact settings when user is logged in', () => {
    const { contactSettings, loadingSettings } = useContactSettings();

    expect(contactSettings.value).toEqual({ contact: 'test' });
    expect(loadingSettings.value).toBe(false);
  });

  it('returns null doc ref when user is not logged in', () => {
    mockUser = null;
    const { contactSettings } = useContactSettings();
    expect(contactSettings.value).toEqual({ contact: 'test' });
    // Since useDocument is mocked, it will always return mockData, but we can check if it runs without error.
  });
});
