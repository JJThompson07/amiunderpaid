<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />
    <div class="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8">
        <h1 class="text-2xl font-black text-slate-900">User Suggestions Queue</h1>
        <p class="text-slate-500 mt-1">Review and approve job title synonyms mapped by users.</p>
      </header>

      <div v-if="pending" class="text-slate-500 font-medium flex items-center gap-2">
        <span
          class="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></span>
        Loading queue...
      </div>

      <div v-else class="flex flex-col gap-4">
        <AmITable
          :columns="tableColumns"
          :data="suggestions"
          empty-message="The queue is currently empty. Good job!">
          <template #search_term="{ value }">
            <span class="font-bold text-slate-900">"{{ value }}"</span>
          </template>

          <template #target_group_name="{ value }">
            <span class="text-sm text-slate-600">{{ value }}</span>
          </template>

          <template #country="{ value }">
            <span class="text-sm font-mono text-slate-500">{{ value }}</span>
          </template>

          <template #target_id_code="{ value }">
            <span class="text-sm font-mono text-slate-500">{{ value }}</span>
          </template>

          <template #count="{ value }">
            <div class="text-center">
              <span
                class="inline-flex items-center justify-center bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {{ value }}
              </span>
            </div>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center justify-end gap-2">
              <button
                class="px-3 py-1.5 text-xs font-bold text-negative-600 bg-negative-50 hover:bg-negative-100 rounded-lg transition-colors disabled:opacity-50"
                :disabled="isProcessing === row.id"
                @click="rejectItem(row.id)">
                Reject
              </button>
              <button
                class="px-3 py-1.5 text-xs font-bold text-white bg-positive-600 hover:bg-positive-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                :disabled="isProcessing === row.id"
                @click="approveItem(row)">
                Approve
              </button>
            </div>
          </template>
        </AmITable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

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
  middleware: 'admin'
});

const firebaseAuth = useFirebaseAuth();
const isProcessing = ref<string | null>(null);

// --- Define AmITable Columns ---
const tableColumns = [
  { key: 'search_term', label: 'User Searched For', class: 'w-1/4' },
  { key: 'target_group_name', label: 'Mapped To (Target Group)' },
  { key: 'country', label: 'Country', class: 'w-24' },
  { key: 'target_id_code', label: 'Code', class: 'w-24' },
  { key: 'count', label: 'Requests', class: 'w-24 text-center', cellClass: 'text-center' },
  { key: 'actions', label: 'Actions', class: 'w-48 text-right', cellClass: 'text-right' }
];

// 1. Fetch the Queue
const { data, pending, refresh } = await useFetch('/api/admin/suggestions');

const suggestions = computed<Suggestion[]>(() => {
  return (data.value?.suggestions as Suggestion[]) || [];
});

// 2. Approve Action
const approveItem = async (item: Suggestion) => {
  isProcessing.value = item.id;
  try {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    await $fetch('/api/admin/suggestions/approve' as any, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        suggestionId: item.id,
        searchTerm: item.search_term,
        targetIdCode: item.target_id_code,
        targetGroupName: item.target_group_name,
        country: item.country
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
    const token = await firebaseAuth?.currentUser?.getIdToken();

    await $fetch('/api/admin/suggestions/reject' as any, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      },
      query: { suggestionId: id }
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
