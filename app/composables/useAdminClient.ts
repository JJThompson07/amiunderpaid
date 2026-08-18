import type { Ref } from 'vue';

type UseAdminClientReturn = {
  loading: Ref<boolean>;
  batchDelete: (
    collectionName: string,
    filters: Record<string, string | number | boolean>,
    description: string
  ) => Promise<void>;
  batchSeed: <T>(data: T[], collectionName: string) => Promise<void>;
};

export const useAdminClient = (log: (msg: string) => void): UseAdminClientReturn => {
  const loading = ref(false);
  const adminFetch = useAdminFetch();

  /**
   * Deletes all documents matching the query in batches.
   */
  const batchDelete = async (
    collectionName: string,
    filters: Record<string, string | number | boolean>,
    description: string
  ): Promise<void> => {
    loading.value = true;
    log(`Preparing to delete ${description}...`);

    try {
      const response = await adminFetch<{ success: boolean; count: number }>('/api/admin/delete', {
        method: 'POST',
        body: { collectionName, filters }
      });

      if (response.count > 0) {
        log(`✅ Successfully deleted ${response.count} records.`);
      } else {
        log('No records found to delete.');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      log(`❌ Delete Error: ${message}`);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Seeds data in batches.
   * @param data Array of data to seed
   */
  const batchSeed = async <T>(data: T[], collectionName: string): Promise<void> => {
    if (data.length === 0) {
      return;
    }
    loading.value = true;
    log('Starting Firestore Batch Sync (Server-Side)...');

    try {
      const response = await adminFetch<{ success: boolean; count: number }>('/api/admin/seed', {
        method: 'POST',
        body: { collectionName, data }
      });

      log(`\n🏆 ALL DONE: ${response.count} records are now live.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      log(`\n❌ FIREBASE ERROR: ${message}`);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    batchDelete,
    batchSeed
  };
};
