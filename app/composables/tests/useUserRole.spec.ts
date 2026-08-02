import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, ref, watch } from 'vue';
import { useUserRole } from '../useUserRole';

// Mock Vue auto-imports
vi.stubGlobal('computed', computed);
vi.stubGlobal('ref', ref);
vi.stubGlobal('watch', watch);

// Mock Nuxt useState
vi.stubGlobal('useState', (key: string, init: () => any) => {
  const state = ref(init ? init() : null);
  return state;
});

// Mock Firestore
const { mockDoc, mockGetDoc } = vi.hoisted(() => ({
  mockDoc: vi.fn((db, path, id) => `doc-${path}-${id}`),
  mockGetDoc: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc
}));

// Mock useFirestore and useCurrentUser
const mockDb = 'mock-db';
vi.stubGlobal('useFirestore', () => mockDb);

const mockUser = ref<{ uid: string } | null>(null);
vi.stubGlobal('useCurrentUser', () => mockUser);

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.value = null;
    
    // Default getDoc mock behavior
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin' })
    });
  });

  it('initializes with null user role and sets it when user logs in', async () => {
    const { userRole, isRoleLoading, isAdmin } = useUserRole();
    
    expect(userRole.value).toBe(null);
    expect(isRoleLoading.value).toBe(false);
    expect(isAdmin.value).toBe(false);
    
    // Simulate user login
    mockUser.value = { uid: 'user-123' };
    
    // Await watch execution
    await nextTick();
    await nextTick(); // sometimes needs two ticks for promises
    // Wait for promise resolution from getDoc
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockGetDoc).toHaveBeenCalledWith('doc-users-user-123');
    expect(userRole.value).toBe('admin');
    expect(isAdmin.value).toBe(true);
    expect(isRoleLoading.value).toBe(false);
  });

  it('sets userRole to user if document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false
    });
    
    mockUser.value = { uid: 'user-456' };
    const { userRole, isStandardUser } = useUserRole();
    
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(userRole.value).toBe('user');
    expect(isStandardUser.value).toBe(true);
  });

  it('sets userRole to user if fetch throws an error', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Firebase error'));
    
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    
    mockUser.value = { uid: 'user-789' };
    const { userRole } = useUserRole();
    
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(userRole.value).toBe('user');
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user role:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('sets userRole to null when user logs out', async () => {
    mockUser.value = { uid: 'user-123' };
    const { userRole } = useUserRole();
    
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(userRole.value).toBe('admin');
    
    // Simulate user logout
    mockUser.value = null;
    await nextTick();
    
    expect(userRole.value).toBe(null);
  });

  it('computed properties return correct values based on role', async () => {
    mockUser.value = { uid: 'user-123' };
    
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'recruiter' })
    });
    
    const { isAdmin, isRecruiter, isStandardUser } = useUserRole();
    
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(isAdmin.value).toBe(false);
    expect(isRecruiter.value).toBe(true);
    expect(isStandardUser.value).toBe(false);
  });
});
