<template>
  <div class="bg-slate-50 p-4 pt-24 min-h-screen">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative flex flex-col gap-8">
      <header
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900">{{ $t('recruiter.dashboard.title') }}</h1>
          <p v-if="userProfile" class="text-slate-500">
            <i18n-t
              keypath="recruiter.dashboard.welcome"
              tag="span"
              class="leading-relaxed text-xs text-slate-500">
              <template #name>
                <strong class="text-primary-700">{{ userProfile.agency_name }}</strong>
              </template>
            </i18n-t>
          </p>
          <AmILoader v-else :message="$t('recruiter.dashboard.loading')" />
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <AmIButton
            title="profile"
            class="w-full md:w-auto"
            bg-colour="bg-primary-600"
            animation-colour="bg-primary-500"
            @click="navigateTo('/recruiter/profile')">
            My Profile
          </AmIButton>
          <AmIButton
            title="logout"
            class="w-full md:w-auto"
            bg-colour="bg-slate-500"
            animation-colour="bg-slate-400"
            @click="handleLogout">
            {{ $t('common.logout') }}
          </AmIButton>
        </div>
      </header>

      <div class="bg-white p-0 md:p-8 rounded-3xl shadow-xs border border-slate-200">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-0 gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
              <MapPin class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ $t('recruiter.territories.my') }}</h2>
          </div>

          <AmIButton
            title="Get Territories"
            class="w-full sm:w-auto"
            :disabled="!isEmailVerified"
            @click="navigateTo('/recruiter/territories')">
            {{ $t('recruiter.territories.get') }}
          </AmIButton>
        </div>

        <div
          v-if="!(userProfile?.activeTerritories?.length || userProfile?.claims?.length)"
          class="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mt-4 p-4">
          <Map class="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 class="text-slate-700 font-bold mb-1">
            {{ $t('recruiter.territories.none') }}
          </h3>
          <p class="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            {{ $t('recruiter.territories.claim.leads') }}
          </p>
          <AmIButton
            title="Claim Territory"
            :disabled="!isEmailVerified"
            @click="navigateTo('/recruiter/territories')">
            {{ $t('recruiter.territories.claim.first') }}
          </AmIButton>
        </div>

        <div v-else class="mt-4 animate-in fade-in duration-300">
          <TerritoryDashboardMatrix
            :territories="userProfile?.activeTerritories || userProfile?.claims"
            :is-cancelling="isCancelling ? territoryToCancel : null"
            @cancel="promptCancel"
            @edit="handleEdit" />
        </div>
      </div>
    </div>

    <ModalCancelTerritory
      v-model="showCancelModal"
      :is-cancelling="isCancelling"
      @confirm="executeCancel" />

    <ToastEmailVerification />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { MapPin, Map } from 'lucide-vue-next'; // Mail icon removed since it's in the toast now

definePageMeta({
  middleware: 'recruiters'
});

// 1. Composables
const { logout } = useRecruiterAuth(); // resendVerificationEmail removed
const { userProfile } = useUserProfile();
const firebaseAuth = useFirebaseAuth();

// 2. Simple Verification State (Just for disabling buttons)
const isEmailVerified = ref(false);

watchEffect(() => {
  if (firebaseAuth?.currentUser) {
    isEmailVerified.value = firebaseAuth.currentUser.emailVerified;
  }
});

// 3. Cancellation State
const showCancelModal = ref(false);
const territoryToCancel = ref<number | null>(null);
const isCancelling = ref(false);

const promptCancel = (territoryId: number) => {
  territoryToCancel.value = territoryId;
  showCancelModal.value = true;
};

const executeCancel = async () => {
  if (!territoryToCancel.value) return;
  isCancelling.value = true;

  try {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    await $fetch('/api/stripe/cancel-territory', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { territoryId: territoryToCancel.value }
    });

    if (userProfile.value?.activeTerritories) {
      userProfile.value.activeTerritories = userProfile.value.activeTerritories.filter(
        (t: any) => t.territoryId !== territoryToCancel.value
      );
    }
    showCancelModal.value = false;
    territoryToCancel.value = null;
  } catch (error) {
    console.error('Failed to cancel territory:', error);
  } finally {
    isCancelling.value = false;
  }
};

const handleEdit = (territoryId: number) => {
  navigateTo(`/recruiter/territories/edit?id=${territoryId}`);
};

// 4. Auth
const handleLogout = async () => {
  await logout();
  await navigateTo('/recruiter/login');
};
</script>
