<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />
    <div class="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8">
        <h1 class="text-2xl font-black text-slate-900">User Suggestions Queue</h1>
        <p class="text-slate-500 mt-1">Review and approve job title synonyms mapped by users.</p>
      </header>

      <div v-if="pending" class="text-slate-500 font-medium">Loading queue...</div>

      <div
        v-else-if="suggestions.length === 0"
        class="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        The queue is currently empty. Good job!
      </div>

      <div v-else class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th class="p-4 font-bold">User Searched For</th>
              <th class="p-4 font-bold">Mapped To (Target Group)</th>
              <th class="p-4 font-bold">Country</th>
              <th class="p-4 font-bold">Code</th>
              <th class="p-4 font-bold text-center">Requests</th>
              <th class="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in suggestions"
              :key="item.id"
              class="hover:bg-slate-50 transition-colors">
              <td class="p-4 font-bold text-slate-900">"{{ item.search_term }}"</td>
              <td class="p-4 text-sm text-slate-600">{{ item.target_group_name }}</td>
              <td class="p-4 text-sm font-mono text-slate-500">{{ item.country }}</td>
              <td class="p-4 text-sm font-mono text-slate-500">{{ item.target_id_code }}</td>
              <td class="p-4 text-center">
                <span
                  class="inline-flex items-center justify-center bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {{ item.count }}
                </span>
              </td>
              <td class="p-4 flex items-center justify-end gap-2">
                <button
                  class="px-3 py-1.5 text-xs font-bold text-negative-600 bg-negative-50 hover:bg-negative-100 rounded-lg transition-colors disabled:opacity-50"
                  :disabled="isProcessing === item.id"
                  @click="rejectItem(item.id)">
                  Reject
                </button>
                <button
                  class="px-3 py-1.5 text-xs font-bold text-white bg-positive-600 hover:bg-positive-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                  :disabled="isProcessing === item.id"
                  @click="approveItem(item)">
                  Approve
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Suggestion {
  id: string;
  search_term: string;
  target_id_code: string;
  target_group_name: string;
  country: string;
  count: number;
  status: string;
}

// Define layout and middleware if required for your admin section
definePageMeta({
  middleware: 'admin' // Assuming you have an admin guard!
});

const isProcessing = ref<string | null>(null);

// 1. Fetch the Queue
const { data, pending, refresh } = await useFetch('/api/admin/suggestions');

const suggestions = computed<Suggestion[]>(() => {
  return (data.value?.suggestions as Suggestion[]) || [];
});

// 2. Approve Action
const approveItem = async (item: Suggestion) => {
  isProcessing.value = item.id;
  try {
    await $fetch('/api/admin/approve-suggestion', {
      method: 'POST',
      body: {
        suggestionId: item.id,
        searchTerm: item.search_term,
        targetIdCode: item.target_id_code,
        targetGroupName: item.target_group_name,
        country: item.country // 👈 Pass the country to the API
      }
    });
    // Remove it from the local list instantly for snappy UX
    await refresh();
  } catch (error) {
    console.error('Failed to approve', error);
    alert('Failed to approve suggestion.');
  } finally {
    isProcessing.value = null;
  }
};

// 3. Reject Action
const rejectItem = async (id: string) => {
  isProcessing.value = id;
  try {
    await $fetch('/api/admin/reject-suggestion', {
      method: 'DELETE',
      body: { suggestionId: id }
    });
    await refresh();
  } catch (error) {
    console.error('Failed to reject', error);
    alert('Failed to reject suggestion.');
  } finally {
    isProcessing.value = null;
  }
};
</script>
