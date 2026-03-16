<template>
  <div class="bg-slate-50 p-4 pt-24">
    <SectionSharedBackdrop />

    <div class="max-w-6xl mx-auto relative">
      <header
        class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-3xl shadow-md border border-slate-200">
        <div>
          <h1 class="text-2xl font-black text-slate-900">{{ $t('recruiter.dashboard') }}</h1>
          <p v-if="userProfile" class="text-slate-500 text-sm mt-1">
            Welcome back, <strong class="text-primary-700">{{ userProfile.agency_name }}</strong>
          </p>
          <p v-else class="text-slate-500 text-sm mt-1 animate-pulse">Loading profile...</p>
        </div>

        <AmIButton
          title="logout"
          class="w-full md:w-auto"
          bg-colour="bg-slate-500"
          animation-colour="bg-slate-400"
          @click="handleLogout">
          Sign Out
        </AmIButton>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="md:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                <MapPin class="w-5 h-5" />
              </div>
              <h2 class="text-xl font-bold text-slate-900">{{ $t('recruiter.territories.my') }}</h2>
            </div>
            <NuxtLink
              to="/recruiter/territories"
              class="transition-all duration-700 ease-in-out bg-primary-500 text-white hover:bg-primary-400 py-2 px-4 rounded-xl"
              >{{ $t('recruiter.territories.get') }}</NuxtLink
            >
          </div>

          <div
            v-if="userProfile?.claims?.length === 0"
            class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Map class="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 class="text-slate-700 font-bold mb-1">No territories claimed</h3>
            <p class="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Claim an exclusive region to start receiving candidate leads from that area.
            </p>
            <AmIButton title="Claim Territory" @click="navigateTo('/recruiter/territories')">
              Claim Your First Territory
            </AmIButton>
          </div>

          <div v-else>
            <p>Territories go here...</p>
          </div>
        </div>

        <div
          class="md:col-span-1 bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
              <BriefcaseBusiness class="w-5 h-5" />
            </div>
            <h2 class="text-xl font-bold text-slate-900">Agency Profile</h2>
          </div>

          <div v-if="userProfile" class="space-y-4">
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Agency Name
              </p>
              <p class="font-medium text-slate-900">{{ userProfile.agency_name }}</p>
            </div>
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
              <p class="font-medium text-slate-900">{{ userProfile.email }}</p>
            </div>
            <div>
              <p class="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Account Status
              </p>
              <div
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MapPin, BriefcaseBusiness, Map } from 'lucide-vue-next';
import { useCurrentUser, useDocument, useFirestore } from 'vuefire';
import { doc } from 'firebase/firestore';

definePageMeta({
  middleware: 'recruiters'
});

// 1. Grab our logout function from the composable
const { logout } = useRecruiterAuth();

// 2. Setup Firebase connections
const user = useCurrentUser();
const db = useFirestore();

// 3. Bind the user's live Firestore document directly to the UI
const userDocRef = computed(() => (user.value ? doc(db, 'users', user.value.uid) : null));
const { data: userProfile } = useDocument(userDocRef);

const handleLogout = async () => {
  await logout();
  await navigateTo('/recruiter/login');
};
</script>
