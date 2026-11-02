import type { Ref } from 'vue';

// Records per request. ~1,000 seeded records is well under 0.5 MB of JSON, an order of
// magnitude below Vercel's 4.5 MB request-body limit.
export const ADMIN_SYNC_CHUNK_SIZE = 1000;

export type AdminSyncProgress = {
  label: string;
  done: number;
  total: number;
};

type UseAdminClientReturn = {
  loading: Ref<boolean>;
  progress: Ref<AdminSyncProgress | null>;
  batchDelete: (
    collectionName: string,
    filters: Record<string, string | number | boolean>,
    description: string
  ) => Promise<void>;
  batchSeed: <T>(data: T[], collectionName: string) => Promise<void>;
  batchSyncSearch: <T>(data: T[], indexName: string) => Promise<void>;
};

export const formatCount = (n: number): string => n.toLocaleString('en-GB');

const formatDuration = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const useAdminClient = (
  log: (msg: string) => void,
  // optional in-place progress line (useConsoleLog's logProgress); falls back to plain lines
  logProgress: (msg: string) => void = log
): UseAdminClientReturn => {
  const loading = ref(false);
  const progress = ref<AdminSyncProgress | null>(null);
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
      log(`❌ Delete Error: ${errorMessage(e)}`);
      throw e;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Sends `data` through `send` one chunk at a time, reporting progress after each chunk.
   * Stops at the first failed chunk and rethrows; callers write with deterministic IDs, so
   * re-running the whole send overwrites rather than duplicates.
   */
  const sendInChunks = async <T>(
    data: T[],
    label: string,
    send: (chunk: T[], start: number) => Promise<unknown>
  ): Promise<void> => {
    const total = data.length;
    const chunks = Math.ceil(total / ADMIN_SYNC_CHUNK_SIZE);
    const started = Date.now();
    log(`${label}: sending ${formatCount(total)} records in ${chunks} chunk(s)...`);
    progress.value = { label, done: 0, total };

    try {
      for (let start = 0; start < total; start += ADMIN_SYNC_CHUNK_SIZE) {
        const chunk = data.slice(start, start + ADMIN_SYNC_CHUNK_SIZE);
        try {
          await send(chunk, start);
        } catch (e: unknown) {
          log(
            `❌ ${label} stopped after ${formatCount(start)} of ${formatCount(total)} records: ${errorMessage(e)}`
          );
          throw e;
        }

        const done = start + chunk.length;
        progress.value = { label, done, total };
        logProgress(
          `${label}: ${formatCount(done)} / ${formatCount(total)} (${Math.round((done / total) * 100)}%)`
        );
      }
      log(
        `✅ ${label} complete: ${formatCount(total)} records in ${formatDuration(Date.now() - started)}.`
      );
    } finally {
      progress.value = null;
    }
  };

  /**
   * Writes records to a Firestore collection via the admin seed endpoint, in chunks.
   */
  /**
   * Runs `work` with `loading` set. A caller that already set `loading` for a longer flow
   * (e.g. Firestore write, then search sync, then a summary refresh) keeps it set afterwards.
   */
  const withLoading = async (work: () => Promise<void>): Promise<void> => {
    const owned = !loading.value;
    loading.value = true;
    try {
      await work();
    } finally {
      if (owned) {
        loading.value = false;
      }
    }
  };

  /**
   * Writes records to a Firestore collection via the admin seed endpoint, in chunks.
   */
  const batchSeed = async <T>(data: T[], collectionName: string): Promise<void> => {
    if (data.length === 0) {
      return;
    }
    await withLoading(() =>
      sendInChunks(data, 'Firestore', (chunk) =>
        adminFetch('/api/admin/seed', { method: 'POST', body: { collectionName, data: chunk } })
      )
    );
  };

  /**
   * Adds or replaces records in a search index via the admin sync endpoint, in chunks. Index
   * settings are applied with the first chunk only.
   */
  const batchSyncSearch = async <T>(data: T[], indexName: string): Promise<void> => {
    if (data.length === 0) {
      return;
    }
    await withLoading(() =>
      sendInChunks(data, 'Search index', (chunk, start) =>
        adminFetch('/api/admin/sync-algolia', {
          method: 'POST',
          body: { data: chunk, indexName, configureSettings: start === 0 }
        })
      )
    );
  };

  return {
    loading,
    progress,
    batchDelete,
    batchSeed,
    batchSyncSearch
  };
};
