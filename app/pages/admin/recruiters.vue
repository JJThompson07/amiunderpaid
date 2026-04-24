<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24 pb-32">
    <SectionSharedBackdrop bg-from="from-secondary-900/50" />
    <div class="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      <header class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-slate-900">Recruiter Management</h1>
          <p class="text-slate-500 mt-1">
            Manage partner agencies, territories, and dynamic pricing discounts.
          </p>
        </div>
        <AmIButton class="text-sm shadow-sm" @click="refresh()"> Refresh List </AmIButton>
      </header>

      <div v-if="pending" class="text-slate-500 font-medium flex items-center gap-2">
        <span
          class="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full"></span>
        Loading recruiters...
      </div>

      <div v-else class="flex flex-col gap-4">
        <AmITable
          :columns="tableColumns"
          :data="recruiters"
          empty-message="No recruiters found on the platform yet.">
          <template #agency="{ row }">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-slate-900">{{ row.agencyName }}</span>
              <span class="text-xs text-slate-500">{{ row.email }}</span>
            </div>
          </template>

          <template #categories="{ value }">
            <div class="flex flex-wrap gap-1">
              <span v-if="!value || value.length === 0" class="text-xs text-slate-400 italic"
                >None</span
              >
              <span
                v-for="cat in value.slice(0, 2)"
                :key="cat"
                class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-600 truncate max-w-[120px]">
                {{ cat }}
              </span>
              <span v-if="value.length > 2" class="text-2xs font-bold text-slate-400">
                +{{ value.length - 2 }}
              </span>
            </div>
          </template>

          <template #territories="{ value }">
            <span
              class="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {{ value }}
            </span>
          </template>

          <template #status="{ row }">
            <div class="flex items-center justify-center gap-1">
              <CheckCircle2 v-if="row.verified" class="w-4 h-4 text-emerald-500" />
              <XCircle v-else class="w-4 h-4 text-slate-300" />
              <span
                class="text-xs font-bold"
                :class="row.verified ? 'text-emerald-700' : 'text-slate-400'">
                {{ row.verified ? 'Verified' : 'Pending' }}
              </span>
            </div>
          </template>

          <template #invoice="{ row }">
            <span class="text-sm font-black text-slate-700">
              {{ row.billingCountry === 'USA' ? '$' : '£'
              }}{{
                row.monthlyInvoice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              }}
            </span>
          </template>

          <template #discounts="{ row }">
            <div class="flex flex-col gap-1 items-end">
              <span
                v-if="row.basicDiscount > 0"
                class="text-2xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                Basic: -{{ row.basicDiscount }}%
              </span>
              <span
                v-if="row.exclusiveDiscount > 0"
                class="text-2xs font-bold text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded">
                Excl: -{{ row.exclusiveDiscount }}%
              </span>
              <span
                v-if="!row.basicDiscount && !row.exclusiveDiscount"
                class="text-xs text-slate-300"
                >-</span
              >
            </div>
          </template>

          <template #actions="{ row }">
            <button
              class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit Discounts"
              @click="openDiscountModal(row)">
              <Tag class="w-4 h-4" />
            </button>
          </template>
        </AmITable>
      </div>
    </div>

    <!-- Discount Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        class="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-black text-slate-900">Manage Discounts</h3>
          <button class="text-slate-400 hover:text-slate-600" @click="showModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-slate-500 mb-6">
          Set custom percentage discounts for
          <strong class="text-slate-800">{{ selectedRecruiter?.agencyName }}</strong
          >.
        </p>

        <div class="space-y-4 mb-8">
          <div>
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2"
              >Basic Tier Discount (%)</label
            >
            <AmIInputGeneric v-model="editBasic" type="number" placeholder="e.g. 10" />
            <p class="text-2xs text-slate-400 mt-1">Applies to the recurring monthly base fee.</p>
          </div>
          <div>
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2"
              >Exclusive Claim Discount (%)</label
            >
            <AmIInputGeneric v-model="editExclusive" type="number" placeholder="e.g. 15" />
            <p class="text-2xs text-slate-400 mt-1">Applies to upfront exclusive month locks.</p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3">
          <button
            class="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            @click="showModal = false">
            Cancel
          </button>
          <AmIButton :loading="isSaving" @click="saveDiscount"> Save Discounts </AmIButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, XCircle, Tag, X } from 'lucide-vue-next';

definePageMeta({ middleware: 'admin' });

const adminFetch = useAdminFetch();
const { showToast } = useSystemToast();

// Table Setup
const tableColumns = [
  { key: 'agency', label: 'Agency / Email', class: 'w-1/4' },
  { key: 'categories', label: 'Industries' },
  { key: 'territories', label: 'Territories', class: 'w-24 text-center', cellClass: 'text-center' },
  { key: 'status', label: 'Status', class: 'w-24 text-center', cellClass: 'text-center' },
  { key: 'invoice', label: 'Monthly Base', class: 'w-32 text-right', cellClass: 'text-right' },
  { key: 'discounts', label: 'Discounts', class: 'w-32 text-right', cellClass: 'text-right' },
  { key: 'actions', label: '', class: 'w-16 text-right', cellClass: 'text-right' }
];

// Data Fetching
const { data, pending, refresh } = await useAsyncData(
  'admin-recruiters',
  () => adminFetch<{ success: boolean; recruiters: any[] }>('/api/admin/recruiters'),
  { server: false }
);

const recruiters = computed(() => data.value?.recruiters || []);

// Modal State
const showModal = ref(false);
const selectedRecruiter = ref<any>(null);
const editBasic = ref<number | string>('');
const editExclusive = ref<number | string>('');
const isSaving = ref(false);

const openDiscountModal = (recruiter: any) => {
  selectedRecruiter.value = recruiter;
  editBasic.value = recruiter.basicDiscount || '';
  editExclusive.value = recruiter.exclusiveDiscount || '';
  showModal.value = true;
};

const saveDiscount = async () => {
  if (!selectedRecruiter.value) return;
  isSaving.value = true;

  try {
    await adminFetch('/api/admin/recruiters/discount', {
      method: 'POST',
      body: {
        uid: selectedRecruiter.value.id,
        basicDiscount: Number(editBasic.value) || 0,
        exclusiveDiscount: Number(editExclusive.value) || 0
      }
    });
    showToast('Success', 'Discounts updated successfully.', 'success');
    showModal.value = false;
    await refresh();
  } catch {
    showToast('Error', 'Failed to update discounts.', 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>
