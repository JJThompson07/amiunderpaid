import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFetch } from '../useAdminFetch';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockLogout = vi.fn();
vi.stubGlobal('useAdminAuth', () => ({ logout: mockLogout }));

const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

const mock$fetch = vi.fn();
vi.stubGlobal('$fetch', mock$fetch);

const mockGetIdToken = vi.fn();
const mockUser = { value: { getIdToken: mockGetIdToken } };
const mockAuthStateReady = vi.fn();
const mockAuth = { authStateReady: mockAuthStateReady };

vi.mock('vuefire', () => ({
  useCurrentUser: vi.fn(() => mockUser),
  useFirebaseAuth: vi.fn(() => mockAuth)
}));

describe('useAdminFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('test-token');
  });

  it('fetches successfully with auth token', async () => {
    mock$fetch.mockResolvedValueOnce({ data: 'ok' });
    const adminFetch = useAdminFetch();

    const res = await adminFetch('/api/test', { method: 'GET' });

    expect(mockAuthStateReady).toHaveBeenCalled();
    expect(mockGetIdToken).toHaveBeenCalledWith(false);
    expect(mock$fetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' }
    });
    expect(res).toEqual({ data: 'ok' });
  });

  it('fetches successfully without auth token when user is null', async () => {
    mock$fetch.mockResolvedValueOnce({ data: 'ok' });
    const { useCurrentUser } = await import('vuefire');
    vi.mocked(useCurrentUser).mockReturnValueOnce({
      value: null
    } as unknown as ReturnType<typeof useCurrentUser>);
    const adminFetch = useAdminFetch();

    const res = await adminFetch('/api/test');

    expect(mock$fetch).toHaveBeenCalledWith('/api/test', { headers: {} });
    expect(res).toEqual({ data: 'ok' });
  });

  it('handles 401 error and redirects to login', async () => {
    mock$fetch.mockRejectedValueOnce({ response: { status: 401 } });
    const adminFetch = useAdminFetch();

    await expect(adminFetch('/api/test')).rejects.toEqual({ response: { status: 401 } });
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigateTo).toHaveBeenCalledWith({ path: '/admin/login' });
  });

  it('handles generic error without redirecting', async () => {
    mock$fetch.mockRejectedValueOnce({ statusCode: 500 });
    const adminFetch = useAdminFetch();

    await expect(adminFetch('/api/test')).rejects.toEqual({ statusCode: 500 });
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockNavigateTo).not.toHaveBeenCalled();
  });

  it('reuses the cached token across requests instead of forcing a refresh each time', async () => {
    mock$fetch.mockResolvedValue({ data: 'ok' });
    const adminFetch = useAdminFetch();

    await adminFetch('/api/admin/seed', { method: 'POST' });
    await adminFetch('/api/admin/seed', { method: 'POST' });

    expect(mockGetIdToken).toHaveBeenCalledTimes(2);
    expect(mockGetIdToken).not.toHaveBeenCalledWith(true);
  });

  it('refreshes the token once and retries when a stale token is forbidden', async () => {
    mockGetIdToken.mockResolvedValueOnce('stale-token').mockResolvedValueOnce('fresh-token');
    mock$fetch
      .mockRejectedValueOnce({ response: { status: 403 } })
      .mockResolvedValueOnce({ data: 'ok' });
    const adminFetch = useAdminFetch();

    const res = await adminFetch('/api/admin/seed', { method: 'POST' });

    expect(res).toEqual({ data: 'ok' });
    expect(mockGetIdToken).toHaveBeenLastCalledWith(true);
    expect(mock$fetch).toHaveBeenLastCalledWith('/api/admin/seed', {
      method: 'POST',
      headers: { Authorization: 'Bearer fresh-token' }
    });
  });

  it('rethrows a 403 that persists after the refresh without logging out', async () => {
    mock$fetch.mockRejectedValue({ statusCode: 403 });
    const adminFetch = useAdminFetch();

    await expect(adminFetch('/api/admin/seed')).rejects.toEqual({ statusCode: 403 });
    expect(mock$fetch).toHaveBeenCalledTimes(2);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('does not retry a 403 when there is no signed-in user', async () => {
    mock$fetch.mockRejectedValueOnce({ statusCode: 403 });
    const { useCurrentUser } = await import('vuefire');
    vi.mocked(useCurrentUser).mockReturnValueOnce({
      value: null
    } as unknown as ReturnType<typeof useCurrentUser>);
    const adminFetch = useAdminFetch();

    await expect(adminFetch('/api/admin/seed')).rejects.toEqual({ statusCode: 403 });
    expect(mock$fetch).toHaveBeenCalledTimes(1);
  });
});
