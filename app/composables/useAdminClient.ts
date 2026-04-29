export const useAdminClient = (log: (msg: string) => void) => {
  const loading = ref(false);
  const adminFetch = useAdminFetch();

  /**
   * Deletes all documents matching the query in batches.
   */
  const batchDelete = async (
    collectionName: string,
    filters: Record<string, any>,
    description: string
  ) => {
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
    } catch (e: any) {
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
  const batchSeed = async <T>(data: T[], collectionName: string) => {
    if (data.length === 0) return;
    loading.value = true;
    log('Starting Firestore Batch Sync (Server-Side)...');

    try {
      const response = await adminFetch<{ success: boolean; count: number }>('/api/admin/seed', {
        method: 'POST',
        body: { collectionName, data }
      });

      log(`\n🏆 ALL DONE: ${response.count} records are now live.`);
    } catch (e: any) {
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
