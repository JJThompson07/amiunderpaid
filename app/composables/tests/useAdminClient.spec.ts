import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_SYNC_CHUNK_SIZE, useAdminClient } from '../useAdminClient';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  getFirestore: vi.fn(),
  Timestamp: { now: vi.fn() }
}));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn() }));

const mockAdminFetch = vi.fn();
vi.stubGlobal('useAdminFetch', () => mockAdminFetch);
vi.stubGlobal('ref', <T>(val: T) => ({ value: val }));

describe('useAdminClient', () => {
  let logMock: Mock<(msg: string) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    logMock = vi.fn<(msg: string) => void>();
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

      await expect(batchDelete('myCollection', {}, 'test items')).rejects.toEqual(
        'API failed string'
      );
      expect(logMock).toHaveBeenCalledWith('❌ Delete Error: API failed string');
    });
  });

  describe('batchSeed', () => {
    it('skips when data is empty', async () => {
      const { batchSeed } = useAdminClient(logMock);
      await batchSeed([], 'myCollection');
      expect(mockAdminFetch).not.toHaveBeenCalled();
    });

    it('sends records to the seed endpoint in chunks of ADMIN_SYNC_CHUNK_SIZE', async () => {
      mockAdminFetch.mockResolvedValue({ success: true });
      const records = Array.from({ length: ADMIN_SYNC_CHUNK_SIZE * 2 + 500 }, (_, i) => ({ i }));
      const { batchSeed } = useAdminClient(logMock);

      await batchSeed(records, 'regional_salary_benchmarks');

      const sizes = mockAdminFetch.mock.calls.map(
        ([, opts]) => (opts as { body: { data: unknown[] } }).body.data.length
      );
      expect(sizes).toEqual([ADMIN_SYNC_CHUNK_SIZE, ADMIN_SYNC_CHUNK_SIZE, 500]);
      expect(mockAdminFetch).toHaveBeenCalledWith('/api/admin/seed', {
        method: 'POST',
        body: { collectionName: 'regional_salary_benchmarks', data: records.slice(0, 1000) }
      });
      expect(logMock).toHaveBeenCalledWith('Firestore: sending 2,500 records in 3 chunk(s)...');
      expect(logMock).toHaveBeenCalledWith(
        expect.stringMatching(/^✅ Firestore complete: 2,500 records in \d+s\.$/)
      );
    });

    it('reports progress in place after each chunk and clears it when done', async () => {
      const progressMock = vi.fn<(msg: string) => void>();
      const client = useAdminClient(logMock, progressMock);
      const seen: unknown[] = [];
      mockAdminFetch.mockImplementation(() => {
        seen.push({ ...client.progress.value });
        return Promise.resolve({ success: true });
      });

      await client.batchSeed(
        Array.from({ length: 1500 }, (_, i) => i),
        'salary_benchmarks'
      );

      expect(seen).toEqual([
        { label: 'Firestore', done: 0, total: 1500 },
        { label: 'Firestore', done: 1000, total: 1500 }
      ]);
      expect(progressMock.mock.calls.map(([msg]) => msg)).toEqual([
        'Firestore: 1,000 / 1,500 (67%)',
        'Firestore: 1,500 / 1,500 (100%)'
      ]);
      expect(client.progress.value).toBeNull();
      expect(client.loading.value).toBe(false);
    });

    it('stops at the first failed chunk, logs how far it got, and rethrows', async () => {
      mockAdminFetch
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('413 Payload Too Large'));
      const { batchSeed, progress, loading } = useAdminClient(logMock);

      await expect(
        batchSeed(
          Array.from({ length: 3000 }, (_, i) => i),
          'regional_salary_benchmarks'
        )
      ).rejects.toThrow('413 Payload Too Large');

      expect(mockAdminFetch).toHaveBeenCalledTimes(2);
      expect(logMock).toHaveBeenCalledWith(
        '❌ Firestore stopped after 1,000 of 3,000 records: 413 Payload Too Large'
      );
      expect(progress.value).toBeNull();
      expect(loading.value).toBe(false);
    });

    it('logs non-Error failures', async () => {
      mockAdminFetch.mockRejectedValueOnce('Seed failed string');
      const { batchSeed } = useAdminClient(logMock);

      await expect(batchSeed([{ id: 1 }], 'myCollection')).rejects.toEqual('Seed failed string');
      expect(logMock).toHaveBeenCalledWith(
        '❌ Firestore stopped after 0 of 1 records: Seed failed string'
      );
    });

    it('reports durations over a minute in minutes and seconds', async () => {
      const now = vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(75_000);
      mockAdminFetch.mockResolvedValue({ success: true });
      const { batchSeed } = useAdminClient(logMock);

      await batchSeed([{ id: 1 }], 'myCollection');

      expect(logMock).toHaveBeenCalledWith('✅ Firestore complete: 1 records in 1m 15s.');
      now.mockRestore();
    });
  });

  describe('batchSyncSearch', () => {
    it('skips when data is empty', async () => {
      const { batchSyncSearch } = useAdminClient(logMock);
      await batchSyncSearch([], 'salary_benchmarks');
      expect(mockAdminFetch).not.toHaveBeenCalled();
    });

    it('sends records to the search sync endpoint in chunks', async () => {
      mockAdminFetch.mockResolvedValue({ success: true });
      const records = Array.from({ length: 1200 }, (_, i) => ({ objectID: String(i) }));
      const { batchSyncSearch, loading } = useAdminClient(logMock);

      await batchSyncSearch(records, 'regional_salary_benchmarks');

      expect(mockAdminFetch).toHaveBeenCalledTimes(2);
      expect(mockAdminFetch).toHaveBeenLastCalledWith('/api/admin/sync-algolia', {
        method: 'POST',
        body: {
          data: records.slice(1000),
          indexName: 'regional_salary_benchmarks',
          configureSettings: false
        }
      });
      expect(logMock).toHaveBeenCalledWith(
        expect.stringMatching(/^✅ Search index complete: 1,200 records/)
      );
      expect(loading.value).toBe(false);
    });

    it('applies index settings with the first chunk only', async () => {
      mockAdminFetch.mockResolvedValue({ success: true });
      const { batchSyncSearch } = useAdminClient(logMock);

      await batchSyncSearch(
        Array.from({ length: 2500 }, (_, i) => i),
        'regional_salary_benchmarks'
      );

      const flags = mockAdminFetch.mock.calls.map(
        ([, opts]) => (opts as { body: { configureSettings: boolean } }).body.configureSettings
      );
      expect(flags).toEqual([true, false, false]);
    });

    it('leaves a caller-owned loading flag set for the rest of the caller flow', async () => {
      mockAdminFetch.mockResolvedValue({ success: true });
      const { batchSeed, batchSyncSearch, loading } = useAdminClient(logMock);
      loading.value = true;

      await batchSeed([{ id: 1 }], 'salary_benchmarks');
      expect(loading.value).toBe(true);
      await batchSyncSearch([{ id: 1 }], 'salary_benchmarks');
      expect(loading.value).toBe(true);
    });

    it('rethrows a failed chunk and clears loading', async () => {
      mockAdminFetch.mockRejectedValueOnce(new Error('Error syncing search index'));
      const { batchSyncSearch, loading } = useAdminClient(logMock);

      await expect(batchSyncSearch([{ objectID: '1' }], 'salary_benchmarks')).rejects.toThrow(
        'Error syncing search index'
      );
      expect(loading.value).toBe(false);
    });
  });
});
