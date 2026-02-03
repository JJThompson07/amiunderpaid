import { ref } from 'vue';
import { useFirestore } from 'vuefire';
import {
  writeBatch,
  getDocs,
  query,
  limit,
  type Query,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';

export const useFirestoreAdmin = (log: (msg: string) => void) => {
  const db = useFirestore();
  const loading = ref(false);

  /**
   * Deletes all documents matching the query in batches.
   */
  const batchDelete = async (q: Query, description: string) => {
    if (!db) return;
    loading.value = true;
    log(`Preparing to delete ${description}...`);

    try {
      let deletedCount = 0;

      while (true) {
        // Fetch only a chunk of documents to avoid memory issues
        const qChunk = query(q, limit(400));
        const snapshot = await getDocs(qChunk);

        if (snapshot.empty) {
          if (deletedCount === 0) log('No records found.');
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        deletedCount += snapshot.size;
        log(`Deleted batch... (Total: ${deletedCount})`);
      }

      if (deletedCount > 0) log(`✅ Successfully deleted ${deletedCount} records.`);
    } catch (e: any) {
      log(`❌ Delete Error: ${e.message}`);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Seeds data in batches.
   * @param data Array of data to seed
   * @param docMapper Function to map a data item to a DocumentReference and data object
   * @param chunkSize Batch size (default 400)
   */
  const batchSeed = async <T>(
    data: T[],
    docMapper: (item: T) => { ref: DocumentReference; data: DocumentData },
    chunkSize = 400
  ) => {
    if (!db || data.length === 0) return;
    loading.value = true;
    log('Starting Firestore Batch Sync...');

    try {
      const total = data.length;
      let processed = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = data.slice(i, i + chunkSize);

        chunk.forEach((item) => {
          const { ref, data } = docMapper(item);
          batch.set(ref, data);
        });

        await batch.commit();
        processed += chunk.length;
        log(`Committed ${processed} records...`);
      }

      log(`\n🏆 ALL DONE: ${total} records are now live.`);
    } catch (e: any) {
      log(`\n❌ FIREBASE ERROR: ${e.message}`);
      console.error('Firestore Error:', e);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    batchDelete,
    batchSeed,
  };
};
