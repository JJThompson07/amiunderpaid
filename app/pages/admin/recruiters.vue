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
          class="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />
        Loading recruiters...
      </div>

      <div v-else class="flex flex-col gap-4">
        <AmITable
          :columns="tableColumns"
          :data="recruiters"
          empty-message="No recruiters found on the platform yet.">
          <template #agency="{ row }">
            <div class="flex flex-col gap-1">
              <span class="text-sm font-bold text-slate-900">{{ asRow(row).agencyName }}</span>
              <span class="text-xs text-slate-500">{{ asRow(row).email }}</span>
              <div
                v-if="asRow(row).ukNationalStatus || asRow(row).usaNationalStatus"
                class="flex gap-1">
                <span
                  v-if="asRow(row).ukNationalStatus"
                  :class="
                    asRow(row).ukNationalStatus === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700'
                  "
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-black uppercase tracking-wider">
                  <Globe class="w-3 h-3" /> UK National{{
                    asRow(row).ukNationalStatus === 'pending' ? ' (Pending)' : ''
                  }}
                </span>
                <span
                  v-if="asRow(row).usaNationalStatus"
                  :class="
                    asRow(row).usaNationalStatus === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700'
                  "
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-black uppercase tracking-wider">
                  <Globe class="w-3 h-3" /> USA National{{
                    asRow(row).usaNationalStatus === 'pending' ? ' (Pending)' : ''
                  }}
                </span>
              </div>
            </div>
          </template>

          <template #categories="{ value }">
            <div class="flex flex-wrap gap-1">
              <span
                v-if="!value || (value as string[]).length === 0"
                class="text-xs text-slate-400 italic"
                >None</span
              >
              <span
                v-for="cat in (value as string[]).slice(0, 2)"
                :key="cat"
                class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-600 truncate max-w-[120px]">
                {{ cat }}
              </span>
              <span v-if="(value as string[]).length > 2" class="text-2xs font-bold text-slate-400">
                +{{ (value as string[]).length - 2 }}
              </span>
            </div>
          </template>

          <template #activeTerritories="{ value }">
            <div
              v-if="!value || (value as TerritoryClaim[]).length === 0"
              class="text-xs text-slate-400 italic">
              None
            </div>
            <div v-else class="flex flex-col gap-1.5 py-1">
              <div
                v-for="(t, idx) in value as TerritoryClaim[]"
                :key="idx"
                class="bg-slate-50 border border-slate-100 rounded-md p-2 flex flex-col gap-1.5">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold text-slate-800">
                    {{ getTerritoryName(t.territoryId) }}
                    <span class="text-slate-500 font-medium ml-1">({{ t.categoryValue }})</span>
                  </span>
                  <div class="flex gap-2">
                    <span
                      v-if="t.isBasic"
                      class="shrink-0 text-2xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded flex items-center justify-center w-4.5 h-4.5"
                      title="Basic">
                      <CheckSquare class="w-3 h-3" />
                    </span>
                    <div
                      v-if="t.exclusiveMonths && t.exclusiveMonths.length > 0"
                      class="flex flex-wrap gap-1">
                      <span
                        v-for="month in t.exclusiveMonths"
                        :key="month"
                        class="text-2xs font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                        {{ month }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #status="{ row }">
            <div class="flex items-center justify-center gap-1">
              <template v-if="asRow(row).status === 'requested'">
                <HelpCircle class="w-4 h-4 text-amber-500 animate-pulse" />
                <span class="text-xs font-bold text-amber-700">Requested</span>
              </template>
              <template v-else-if="asRow(row).status === 'rejected'">
                <XCircle class="w-4 h-4 text-red-500" />
                <span class="text-xs font-bold text-red-700">Rejected</span>
              </template>
              <template v-else>
                <CheckCircle2 v-if="asRow(row).verified" class="w-4 h-4 text-emerald-500" />
                <XCircle v-else class="w-4 h-4 text-slate-300" />
                <span
                  class="text-xs font-bold"
                  :class="asRow(row).verified ? 'text-emerald-700' : 'text-slate-400'">
                  {{ asRow(row).verified ? 'Verified' : 'Pending' }}
                </span>
              </template>
            </div>
          </template>

          <template #invoice="{ row }">
            <span class="text-sm font-black text-slate-700">
              {{ asRow(row).billingCountry === 'USA' ? '$' : '£'
              }}{{
                asRow(row).monthlyInvoice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              }}
            </span>
          </template>

          <template #discounts="{ row }">
            <div class="flex flex-col gap-1 items-end">
              <span
                v-if="asRow(row).basicDiscount > 0"
                class="text-2xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                Basic: -{{ asRow(row).basicDiscount }}%
              </span>
              <span
                v-if="asRow(row).exclusiveDiscount > 0"
                class="text-2xs font-bold text-secondary-600 bg-secondary-50 px-2 py-0.5 rounded">
                Excl: -{{ asRow(row).exclusiveDiscount }}%
              </span>
              <span
                v-if="!asRow(row).basicDiscount && !asRow(row).exclusiveDiscount"
                class="text-xs text-slate-300"
                >-</span
              >
            </div>
          </template>

          <template #actions="{ row }">
            <div class="flex items-center justify-end gap-1">
              <template v-if="asRow(row).status === 'requested'">
                <button
                  class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Accept Access Request"
                  :disabled="actioningIds.has(asRow(row).id)"
                  @click="acceptRequest(asRow(row))">
                  <Check class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Reject Access Request"
                  :disabled="actioningIds.has(asRow(row).id)"
                  @click="rejectRequest(asRow(row))">
                  <X class="w-4 h-4" />
                </button>
              </template>
              <template v-else-if="asRow(row).status === 'rejected'">
                <span class="text-xs text-slate-300 italic">No Actions</span>
              </template>
              <template v-else>
                <button
                  class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Manage National Coverage"
                  @click="openNationalModal(asRow(row))">
                  <Globe class="w-4 h-4" />
                </button>
                <button
                  class="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Discounts"
                  @click="openDiscountModal(asRow(row))">
                  <Tag class="w-4 h-4" />
                </button>
              </template>
            </div>
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

    <!-- National Coverage Modal -->
    <div
      v-if="showNationalModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        class="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-black text-slate-900">Manage National Coverage</h3>
          <button class="text-slate-400 hover:text-slate-600" @click="showNationalModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="text-sm text-slate-500 mb-6">
          Grants Basic-tier visibility across every territory in a country for
          <strong class="text-slate-800">{{ selectedRecruiter?.agencyName }}</strong
          >'s covered industries, at a flat Band 1 price. Granting wipes any existing local
          territories in that country.
        </p>

        <div class="space-y-3 mb-8">
          <div
            v-for="option in nationalOptions"
            :key="option.country"
            class="flex items-center justify-between p-3 rounded-xl border border-slate-200">
            <span class="text-sm font-bold text-slate-700 flex items-center gap-2">
              {{ option.label }}
              <span
                v-if="option.status === 'pending'"
                class="text-2xs font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Pending
              </span>
            </span>
            <AmIButton
              :loading="nationalActionCountry === option.country"
              :class="option.status ? '!bg-red-600 hover:!bg-red-700' : ''"
              @click="toggleNational(option.country, !option.status)">
              {{ option.status ? 'Revoke' : 'Grant' }}
            </AmIButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Globe,
  HelpCircle,
  Tag,
  X,
  XCircle
} from 'lucide-vue-next';
import { FetchError } from 'ofetch';
import type { TerritoryClaim } from '~~/shared/utils/types';

// A recruiter row as returned by GET /api/admin/recruiters (see index.get.ts).
type AdminRecruiterRow = {
  id: string;
  email: string;
  agencyName: string;
  categories: string[];
  activeTerritories: TerritoryClaim[];
  territoriesCount: number;
  verified: boolean;
  status: string;
  monthlyInvoice: number;
  billingCountry: string;
  basicDiscount: number;
  exclusiveDiscount: number;
  ukNationalStatus: 'pending' | 'active' | null;
  usaNationalStatus: 'pending' | 'active' | null;
};

type NationalCountry = 'UK' | 'USA';

definePageMeta({ middleware: 'admin' });

// AmITable's slot-scoped `row` is typed Record<string, unknown> (it's a
// generic reusable table), but every row here is always an AdminRecruiterRow.
const asRow = (row: Record<string, unknown>): AdminRecruiterRow =>
  row as unknown as AdminRecruiterRow;

const adminFetch = useAdminFetch();
const { showToast } = useSystemToast();

const actioningIds = ref(new Set<string>());

const acceptRequest = async (row: AdminRecruiterRow): Promise<void> => {
  if (actioningIds.value.has(row.id)) {
    return;
  }

  if (
    !confirm(
      `Are you sure you want to accept the access request for ${row.agencyName} (${row.email})?`
    )
  ) {
    return;
  }

  actioningIds.value.add(row.id);
  try {
    const res = await adminFetch<{ success: boolean; message?: string }>(
      '/api/admin/recruiters/accept',
      {
        method: 'POST',
        body: { uid: row.id }
      }
    );
    if (res?.success) {
      showToast(
        'Accepted',
        'Recruiter access request approved successfully. Invitation email sent.',
        'success'
      );
      await refresh();
    } else {
      showToast('Error', res?.message || 'Failed to accept recruiter.', 'error');
    }
  } catch (err) {
    const msg =
      err instanceof FetchError && err.data?.message
        ? err.data.message
        : 'An error occurred while approving the request.';
    showToast('Error', msg, 'error');
  } finally {
    actioningIds.value.delete(row.id);
  }
};

const rejectRequest = async (row: AdminRecruiterRow): Promise<void> => {
  if (actioningIds.value.has(row.id)) {
    return;
  }

  if (
    !confirm(
      `Are you sure you want to reject the access request for ${row.agencyName} (${row.email})?`
    )
  ) {
    return;
  }

  actioningIds.value.add(row.id);
  try {
    const res = await adminFetch<{ success: boolean; message?: string }>(
      '/api/admin/recruiters/reject',
      {
        method: 'POST',
        body: { uid: row.id }
      }
    );
    if (res?.success) {
      showToast('Rejected', 'Recruiter access request rejected.', 'success');
      await refresh();
    } else {
      showToast('Error', res?.message || 'Failed to reject recruiter.', 'error');
    }
  } catch (err) {
    const msg =
      err instanceof FetchError && err.data?.message
        ? err.data.message
        : 'An error occurred while rejecting the request.';
    showToast('Error', msg, 'error');
  } finally {
    actioningIds.value.delete(row.id);
  }
};

const { getTerritoryById } = useTerritories();
const getTerritoryName = (id: number): string => {
  const t = getTerritoryById(id);
  return t ? t.name : `Region #${id}`;
};

// Table Setup
const tableColumns = [
  { key: 'agency', label: 'Agency / Email', class: 'w-1/5' },
  { key: 'categories', label: 'Industries', class: 'w-32' },
  { key: 'activeTerritories', label: 'Active Territories', class: 'w-1/3' },
  { key: 'status', label: 'Status', class: 'w-24 text-center', cellClass: 'text-center' },
  { key: 'invoice', label: 'Monthly Base', class: 'w-28 text-right', cellClass: 'text-right' },
  { key: 'discounts', label: 'Discounts', class: 'w-28 text-right', cellClass: 'text-right' },
  { key: 'actions', label: '', class: 'w-12 text-right', cellClass: 'text-right' }
];

// Data Fetching
const { data, pending, refresh } = await useAsyncData(
  'admin-recruiters',
  () => adminFetch<{ success: boolean; recruiters: AdminRecruiterRow[] }>('/api/admin/recruiters'),
  { server: false }
);

const recruiters = computed(() => data.value?.recruiters || []);

// Modal State
const showModal = ref(false);
const selectedRecruiter = ref<AdminRecruiterRow | null>(null);
const editBasic = ref<number | string>('');
const editExclusive = ref<number | string>('');
const isSaving = ref(false);

const openDiscountModal = (recruiter: AdminRecruiterRow): void => {
  selectedRecruiter.value = recruiter;
  editBasic.value = recruiter.basicDiscount || '';
  editExclusive.value = recruiter.exclusiveDiscount || '';
  showModal.value = true;
};

// National Coverage Modal State
const showNationalModal = ref(false);
const nationalActionCountry = ref<NationalCountry | null>(null);

const nationalOptions = computed(() => {
  if (!selectedRecruiter.value) {
    return [];
  }
  return [
    {
      country: 'UK' as NationalCountry,
      label: 'UK National',
      status: selectedRecruiter.value.ukNationalStatus
    },
    {
      country: 'USA' as NationalCountry,
      label: 'USA National',
      status: selectedRecruiter.value.usaNationalStatus
    }
  ];
});

const openNationalModal = (recruiter: AdminRecruiterRow): void => {
  selectedRecruiter.value = recruiter;
  showNationalModal.value = true;
};

const toggleNational = async (country: NationalCountry, active: boolean): Promise<void> => {
  if (!selectedRecruiter.value || nationalActionCountry.value) {
    return;
  }

  if (
    !confirm(
      active
        ? `Grant ${country} National coverage to ${selectedRecruiter.value.agencyName}? This wipes any existing local ${country} territories. If they have an active subscription this bills a flat Band 1 charge immediately; otherwise it's granted pending their confirmation via Stripe Checkout.`
        : `Revoke ${country} National coverage from ${selectedRecruiter.value.agencyName}? They will lose all coverage in ${country} until they re-purchase territories.`
    )
  ) {
    return;
  }

  nationalActionCountry.value = country;
  try {
    const res = await adminFetch<{ success: boolean; status: 'pending' | 'active' | null }>(
      '/api/admin/recruiters/set-national',
      {
        method: 'POST',
        body: { uid: selectedRecruiter.value.id, country, active }
      }
    );
    const outcome =
      active && res?.status === 'pending'
        ? 'granted (pending confirmation)'
        : active
          ? 'granted'
          : 'revoked';
    showToast('Success', `${country} National coverage ${outcome}.`, 'success');
    showNationalModal.value = false;
    await refresh();
  } catch (err) {
    const msg =
      err instanceof FetchError && err.data?.message
        ? err.data.message
        : 'Failed to update national coverage.';
    showToast('Error', msg, 'error');
  } finally {
    nationalActionCountry.value = null;
  }
};

const saveDiscount = async (): Promise<void> => {
  if (!selectedRecruiter.value) {
    return;
  }
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
