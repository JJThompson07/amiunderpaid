<template>
  <div class="max-w-6xl p-6 mx-auto space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Jobs Cache Management</h1>
      <p class="text-slate-600 mt-1">
        Manage cache lifespan and approve user-submitted government role matches.
      </p>
    </div>

    <div class="p-6 bg-white border rounded-xl border-slate-200 shadow-sm space-y-4">
      <div class="flex items-center gap-2">
        <DatabaseZap class="w-5 h-5 text-indigo-600" />
        <h2 class="text-xl font-bold text-slate-900">Cache Maintenance</h2>
      </div>
      <p class="text-sm text-slate-600">
        Run this to instantly scrub expired Adzuna requests (Jobs older than 24h, Distribution older
        than 7 days) and remove any invalid entries missing a category tag.
      </p>

      <div class="flex items-center gap-4">
        <AmIButton
          :disabled="isCleaning"
          class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          @click="runCleanup">
          <div class="flex gap-2 items-center">
            <RefreshCcw v-if="isCleaning" class="w-4 h-4 animate-spin" />
            <Trash2 v-else class="w-4 h-4" />
            {{ isCleaning ? 'Cleaning Cache...' : 'Run Cache Cleanup' }}
          </div>
        </AmIButton>

        <p
          v-if="cleanupStats"
          class="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
          Success: Deleted {{ cleanupStats.deletedJobs }} jobs &
          {{ cleanupStats.deletedDistributions }} distributions.
        </p>
      </div>
    </div>

    <div class="p-6 bg-white border rounded-xl border-slate-200 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Users class="w-5 h-5 text-amber-600" />
          <h2 class="text-xl font-bold text-slate-900">Pending Match Suggestions</h2>
        </div>
        <AmIButton
          class="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700"
          @click="refreshSuggestions">
          Refresh Queue
        </AmIButton>
      </div>

      <div v-if="pending" class="py-10 text-center text-slate-500">Loading suggestions...</div>

      <div
        v-else-if="suggestions.length === 0"
        class="py-10 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <CheckCircle2 class="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p class="text-slate-600 font-medium">All caught up!</p>
        <p class="text-slate-500 text-sm">No pending match suggestions in the queue.</p>
      </div>

      <div v-else class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full text-sm text-left text-slate-600">
          <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th scope="col" class="px-6 py-3">Search Term</th>
              <th scope="col" class="px-6 py-3">Suggested Gov Title</th>
              <th scope="col" class="px-6 py-3">Suggested Gov ID</th>
              <th scope="col" class="px-6 py-3">Source</th>
              <th scope="col" class="px-6 py-3">Date</th>
              <th scope="col" class="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in suggestions"
              :key="item.id"
              class="bg-white border-b hover:bg-slate-50">
              <td class="p-3 font-medium text-slate-900">{{ item.title }}</td>

              <td class="p-3">
                {{ item.suggested_gov_title }}
                <span class="text-2xs text-slate-400 uppercase ml-1">({{ item.country }})</span>
              </td>
              <td class="p-3 font-mono text-indigo-600 font-bold">
                {{ item.suggested_gov_id }}
              </td>
              <td class="p-3">
                <span
                  v-if="item.is_automatic_system_save"
                  class="px-2 py-1 text-2xs font-medium bg-blue-100 text-blue-700 rounded-md whitespace-nowrap"
                  >System Match</span
                >
                <span
                  v-else
                  class="px-2 py-1 text-2xs font-medium bg-amber-100 text-amber-700 rounded-md"
                  >User Click</span
                >
              </td>
              <td class="p-3 text-xs">{{ item.timestamp }}</td>
              <td class="p-3 text-right flex flex-col gap-2">
                <AmIButton title="Approve & Save to Cache" @click="approveMatch(item)">
                  <Check class="w-5 h-5 mx-auto" />
                </AmIButton>
                <AmIButton
                  class="text-center"
                  title="Reject & Delete"
                  bg-colour="bg-negative-700"
                  @click="rejectMatch(item.id)">
                  <X class="w-5 h-5 mx-auto" />
                </AmIButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DatabaseZap, Trash2, RefreshCcw, Users, Check, X, CheckCircle2 } from 'lucide-vue-next';
import { ref } from 'vue';

// Protect this route with your admin middleware
definePageMeta({
  middleware: 'admin'
});

// --- Cache Cleanup Logic ---
const isCleaning = ref(false);
const cleanupStats = ref<{ deletedJobs: number; deletedDistributions: number } | null>(null);

const runCleanup = async () => {
  if (
    !confirm(
      'Are you sure you want to run the cache cleanup? This will delete all expired entries.'
    )
  )
    return;

  isCleaning.value = true;
  cleanupStats.value = null;

  try {
    const res: any = await $fetch('/api/admin/clean-cache', { method: 'POST' });
    cleanupStats.value = res.stats;
  } catch (error) {
    console.error('Failed to clean cache', error);
    alert('Failed to clean cache. Check console for details.');
  } finally {
    isCleaning.value = false;
  }
};

// --- Suggestions Logic ---
const {
  data: suggestionsData,
  pending,
  refresh: refreshSuggestions
} = useFetch('/api/admin/suggestions');
const suggestions = computed(() => suggestionsData.value?.suggestions || []);

const approveMatch = async (suggestion: any) => {
  try {
    await $fetch('/api/admin/approve-suggestion', {
      method: 'POST',
      body: {
        suggestionId: suggestion.id,
        title: suggestion.title,
        location: suggestion.location,
        country: suggestion.country,
        gov_id_code: suggestion.suggested_gov_id
      }
    });
    // Remove it from the UI immediately to feel fast
    refreshSuggestions();
  } catch (err) {
    console.error('Approval failed', err);
    alert('Failed to approve match.');
  }
};

const rejectMatch = async (id: string) => {
  if (!confirm('Are you sure you want to reject and delete this suggestion?')) return;

  try {
    // Hit the new, unique endpoint so TypeScript doesn't get confused
    await $fetch('/api/admin/reject-suggestion', {
      method: 'DELETE',
      query: { id }
    });
    refreshSuggestions();
  } catch (err) {
    console.error('Rejection failed', err);
    alert('Failed to reject match.');
  }
};
</script>
