<template>
  <div class="max-w-6xl p-6 mx-auto space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Admin Actions</h1>
      <p class="text-slate-600 mt-1">
        Run manual, long-running, or periodic server tasks and watch their progress live.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <div class="p-6 bg-white border rounded-xl border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center gap-2">
          <DatabaseZap class="w-5 h-5 text-indigo-600" />
          <h2 class="text-xl font-bold text-slate-900">Cache Cleanup</h2>
        </div>
        <p class="text-sm text-slate-600">
          Instantly scrub expired Adzuna requests (Jobs older than 24h, Distribution older than 7
          days) and remove any invalid entries missing a category tag.
        </p>

        <AmIButton
          :disabled="runningActions['clean-cache']"
          class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          @click="runCacheCleanup">
          <div class="flex gap-2 items-center">
            <RefreshCcw v-if="runningActions['clean-cache']" class="w-4 h-4 animate-spin" />
            <Trash2 v-else class="w-4 h-4" />
            {{ runningActions['clean-cache'] ? 'Cleaning Cache...' : 'Run Cache Cleanup' }}
          </div>
        </AmIButton>
      </div>

      <div class="p-6 bg-white border rounded-xl border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center gap-2">
          <TrendingUp class="w-5 h-5 text-emerald-600" />
          <h2 class="text-xl font-bold text-slate-900">Sync Industry Trends (Cron)</h2>
        </div>
        <p class="text-sm text-slate-600">
          Fetches the latest month's average salary data from Adzuna for every tracked industry
          category, mirroring what the automated monthly cron sync does.
        </p>

        <AmIButton
          :disabled="runningActions['sync-trends']"
          class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          @click="runSyncTrends">
          <div class="flex gap-2 items-center">
            <RefreshCcw v-if="runningActions['sync-trends']" class="w-4 h-4 animate-spin" />
            <TrendingUp v-else class="w-4 h-4" />
            {{ runningActions['sync-trends'] ? 'Syncing...' : 'Run Trends Sync' }}
          </div>
        </AmIButton>
      </div>
    </div>

    <div class="p-6 bg-white border rounded-xl border-slate-200 shadow-sm space-y-4">
      <div class="flex items-center gap-2">
        <Terminal class="w-5 h-5 text-slate-600" />
        <h2 class="text-xl font-bold text-slate-900">Action Log</h2>
      </div>

      <div
        ref="terminalRef"
        class="p-4 overflow-y-auto text-sm bg-slate-900 rounded-xl h-64 font-mono">
        <p v-if="logs.length === 0" class="text-slate-500">No actions run yet.</p>
        <p v-for="log in logs" :key="log.id" :class="logColorClass(log.type)">
          [{{ log.timestamp }}] {{ log.text }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DatabaseZap, RefreshCcw, Terminal, Trash2, TrendingUp } from 'lucide-vue-next';

// Protect this route with your admin middleware
definePageMeta({
  middleware: 'admin'
});

type LogMessage = {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'error';
};

const adminFetch = useAdminFetch();

const logs = ref<LogMessage[]>([]);
const terminalRef = ref<HTMLElement | null>(null);
// Keyed by action, rather than one shared boolean, so the two Action Cards
// disable independently -- running Cache Cleanup shouldn't block Sync
// Industry Trends from also being started.
const runningActions = reactive<Record<string, boolean>>({});

const addLog = (text: string, type: LogMessage['type']): void => {
  logs.value.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    text,
    type
  });
};

const logColorClass = (type: LogMessage['type']): string => {
  if (type === 'success') {
    return 'text-emerald-400';
  }
  if (type === 'error') {
    return 'text-red-400';
  }
  return 'text-slate-300';
};

watch(logs, async () => {
  await nextTick();
  if (terminalRef.value) {
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
  }
});

// Every action follows the same protocol -- starting log, await, then a
// success or error log -- so this is the one place that owns it instead of
// duplicating try/catch/log boilerplate in each action handler below.
const executeAction = async (
  key: string,
  label: string,
  apiCall: () => Promise<string>
): Promise<void> => {
  if (runningActions[key]) {
    return;
  }
  runningActions[key] = true;
  addLog(`Starting ${label}...`, 'info');

  try {
    const successMessage = await apiCall();
    addLog(successMessage, 'success');
  } catch (error) {
    addLog(error instanceof Error ? error.message : `Failed to run ${label}.`, 'error');
  } finally {
    runningActions[key] = false;
  }
};

const runCacheCleanup = (): Promise<void> => {
  if (
    !confirm(
      'Are you sure you want to run the cache cleanup? This will delete all expired entries.'
    )
  ) {
    return Promise.resolve();
  }

  return executeAction('clean-cache', 'Cache Cleanup', async () => {
    const res = await adminFetch<{ stats: { deletedJobs: number; deletedDistributions: number } }>(
      '/api/admin/clean-cache',
      { method: 'POST' }
    );
    return `Success: Deleted ${res.stats.deletedJobs} jobs & ${res.stats.deletedDistributions} distributions.`;
  });
};

const runSyncTrends = (): Promise<void> =>
  executeAction('sync-trends', 'Sync Industry Trends', async () => {
    const res = await adminFetch<{ synced: number; failed: number }>('/api/admin/sync-trends', {
      method: 'POST',
      body: { months: 1 }
    });
    return `Success: Synced ${res.synced} categories (${res.failed} failed).`;
  });
</script>
