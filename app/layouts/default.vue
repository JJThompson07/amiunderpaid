<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
    <!-- Navbar -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-slate-200/50">
      <div class="flex flex-wrap items-center justify-between min-h-16 px-4 py-2 mx-auto max-w-7xl">
        <!-- Logo -->
        <NuxtLink href="/" class="flex items-center gap-2 absolute" @click="openMenu = false">
          <div
            class="flex items-center gap-1 text-xl font-bold tracking-tight text-primary-600 select-none">
            <div class="logo h-7 w-7" aria-label="Am I" />
            <span class="text-slate-900">Underpaid</span>
          </div>
        </NuxtLink>

        <!-- Nav -->
        <LazyAmINavBar v-if="!isMobile" :is-admin="isAdmin" />

        <!-- CTA -->
        <div class="flex flex-1 md:flex-0 items-center justify-end gap-4 absolute right-4">
          <AmIButton
            v-if="user"
            bg-colour="bg-transparent"
            text-colour="text-slate-600"
            animation-colour="bg-primary-400"
            title="Sign out"
            @click="handleLogout"
            >Sign Out</AmIButton
          >
          <button v-if="isMobile" class="p-1" @click="openMenu = !openMenu">
            <MenuIcon v-if="!openMenu" class="w-5 h-5" />
            <XIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <LazyAmINavBar
      v-if="openMenu && isMobile"
      :is-admin="isAdmin"
      :is-mobile="true"
      @close="openMenu = false" />

    <!-- Main Content -->
    <div class="flex-1">
      <slot />
    </div>

    <!-- Simple Footer -->
    <footer class="py-8 text-sm text-center bg-white border-t border-slate-200 text-slate-400">
      <p>&copy; 2026 Am I Underpaid. All rights reserved.</p>
      <div class="mt-4 flex justify-center gap-6 items-center">
        <NuxtLink
          to="/privacy-policy"
          class="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Privacy Policy
        </NuxtLink>
        <NuxtLink
          to="/admin/login"
          class="text-xs text-slate-300 hover:text-slate-500 transition-colors"
          >Admin Access</NuxtLink
        >
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useCurrentUser, useFirebaseAuth } from 'vuefire';
import { signOut } from 'firebase/auth';
import { ref } from 'vue';
import { MenuIcon, XIcon } from 'lucide-vue-next';

const { isMobile } = useViewport();

const openMenu = ref<boolean>(false);

const user = useCurrentUser();
const auth = useFirebaseAuth();

const isAdmin = computed(() => Boolean(user.value?.email));

const handleLogout = async () => {
  if (auth) {
    await signOut(auth);
    await navigateTo('/');
  }
};
</script>

<style>
.logo {
  background: url('../../assets/img/logo.png') no-repeat center center;
  background-size: cover;
}
</style>
