import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { useUserProfile } from '../useUserProfile';

// Mock Vue's ref and computed to use actual Vue functions so reactivity works
vi.stubGlobal('computed', computed);
vi.stubGlobal('ref', ref);

// Mock Firestore using vi.hoisted
const { mockDoc, mockUpdateDoc } = vi.hoisted(() => ({
  mockDoc: vi.fn((db, path, id) => `doc-${path}-${id}`),
  mockUpdateDoc: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  updateDoc: mockUpdateDoc
}));

// Mock Nuxt auto-imports
const mockDb = 'mock-db';
vi.stubGlobal('useFirestore', () => mockDb);

const mockUser = ref<{ uid: string } | null>(null);
vi.stubGlobal('useCurrentUser', () => mockUser);

const mockUserProfile = ref<any>(null);
const mockLoadingProfile = ref(false);
vi.stubGlobal('useDocument', vi.fn(() => ({
  data: mockUserProfile,
  pending: mockLoadingProfile
})));

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.value = { uid: 'user-123' };
    mockUserProfile.value = null;
    mockLoadingProfile.value = false;
  });

  it('initializes and computes userDocRef correctly when user exists', () => {
    const { userProfile, loadingProfile } = useUserProfile();
    
    // Check that useDocument was called
    const useDocumentMock = vi.mocked(globalThis.useDocument as any);
    expect(useDocumentMock).toHaveBeenCalledTimes(1);
    
    // Evaluate the computed userDocRef
    const userDocRefComputed = useDocumentMock.mock.calls[0][0];
    expect(userDocRefComputed.value).toBe('doc-users-user-123');
    
    // Ensure it returns the values from useDocument
    expect(userProfile).toBe(mockUserProfile);
    expect(loadingProfile).toBe(mockLoadingProfile);
  });

  it('computes userDocRef as null when no user exists', () => {
    mockUser.value = null;
    useUserProfile();
    
    const useDocumentMock = vi.mocked(globalThis.useDocument as any);
    const userDocRefComputed = useDocumentMock.mock.calls[0][0];
    expect(userDocRefComputed.value).toBe(null);
  });

  describe('updateProfile', () => {
    it('throws error if user is not authenticated', async () => {
      mockUser.value = null;
      const { updateProfile } = useUserProfile();
      
      await expect(updateProfile({ name: 'Test' })).rejects.toThrow('User is not authenticated.');
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('calls updateDoc with the correct reference and data', async () => {
      const { updateProfile } = useUserProfile();
      
      // We need to mock Date to assert updatedAt predictably, or just use any(Date)
      const fakeDate = new Date('2026-08-01T12:00:00Z');
      vi.setSystemTime(fakeDate);
      
      await updateProfile({ displayName: 'John Doe', age: 30 });
      
      expect(mockDoc).toHaveBeenCalledWith('mock-db', 'users', 'user-123');
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith('doc-users-user-123', {
        displayName: 'John Doe',
        age: 30,
        updatedAt: fakeDate
      });
      
      vi.useRealTimers();
    });
  });
});
