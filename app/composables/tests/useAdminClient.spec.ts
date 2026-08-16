import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminClient } from '../useAdminClient';

vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), getFirestore: vi.fn(), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockAdminFetch = vi.fn();
vi.stubGlobal('useAdminFetch', () => mockAdminFetch);
vi.stubGlobal('ref', (val: any) => ({ value: val }));

describe('useAdminClient', () => {
  let logMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    logMock = vi.fn();
  });

  describe('batchDelete', () => {
    it('deletes successfully and logs count', async () => {
      mockAdminFetch.mockResolvedValueOnce({ success: true, count: 5 });
      const { batchDelete, loading } = useAdminClient(logMock);
      
      await batchDelete('myCollection', { field: 'value' }, 'test items');
      
      expect(loading.value).toBe(false);
      expect(mockAdminFetch).toHaveBeenCalledWith('/api/admin/delete', {
        method: 'POST',
        body: { collectionName: 'myCollection', filters: { field: 'value' } }
      });
      expect(logMock).toHaveBeenCalledWith('✅ Successfully deleted 5 records.');
    });

    it('logs when no records found to delete', async () => {
      mockAdminFetch.mockResolvedValueOnce({ success: true, count: 0 });
      const { batchDelete } = useAdminClient(logMock);
      
      await batchDelete('myCollection', {}, 'test items');
      
      expect(logMock).toHaveBeenCalledWith('No records found to delete.');
    });

    it('handles and throws errors during delete', async () => {
      mockAdminFetch.mockRejectedValueOnce(new Error('API failed'));
      const { batchDelete } = useAdminClient(logMock);
      
      await expect(batchDelete('myCollection', {}, 'test items')).rejects.toThrow('API failed');
      expect(logMock).toHaveBeenCalledWith('❌ Delete Error: API failed');
    });

    it('handles and throws non-Error objects during delete', async () => {
      mockAdminFetch.mockRejectedValueOnce('API failed string');
      const { batchDelete } = useAdminClient(logMock);
      
      await expect(batchDelete('myCollection', {}, 'test items')).rejects.toEqual('API failed string');
      expect(logMock).toHaveBeenCalledWith('❌ Delete Error: API failed string');
    });
  });

  describe('batchSeed', () => {
    it('skips when data is empty', async () => {
      const { batchSeed } = useAdminClient(logMock);
      await batchSeed([], 'myCollection');
      expect(mockAdminFetch).not.toHaveBeenCalled();
    });

    it('seeds successfully and logs completion', async () => {
      mockAdminFetch.mockResolvedValueOnce({ success: true, count: 10 });
      const { batchSeed } = useAdminClient(logMock);
      
      await batchSeed([{ id: 1 }], 'myCollection');
      
      expect(mockAdminFetch).toHaveBeenCalledWith('/api/admin/seed', {
        method: 'POST',
        body: { collectionName: 'myCollection', data: [{ id: 1 }] }
      });
      expect(logMock).toHaveBeenCalledWith('\n🏆 ALL DONE: 10 records are now live.');
    });

    it('handles errors during seed', async () => {
      mockAdminFetch.mockRejectedValueOnce(new Error('Seed failed'));
      const { batchSeed } = useAdminClient(logMock);
      
      await expect(batchSeed([{ id: 1 }], 'myCollection')).rejects.toThrow('Seed failed');
      expect(logMock).toHaveBeenCalledWith('\n❌ FIREBASE ERROR: Seed failed');
    });

    it('handles non-Error objects during seed', async () => {
      mockAdminFetch.mockRejectedValueOnce('Seed failed string');
      const { batchSeed } = useAdminClient(logMock);
      
      await expect(batchSeed([{ id: 1 }], 'myCollection')).rejects.toEqual('Seed failed string');
      expect(logMock).toHaveBeenCalledWith('\n❌ FIREBASE ERROR: Seed failed string');
    });
  });
});
