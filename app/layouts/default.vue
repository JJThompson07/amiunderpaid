<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
    <!-- Navbar -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-slate-200/50">
      <div class="flex flex-wrap items-center justify-between min-h-16 px-4 py-2 mx-auto max-w-7xl">
        <!-- Logo -->
        <NuxtLink href="/" class="flex items-center gap-2">
          <div
            class="flex items-center gap-2 text-xl font-bold tracking-tight text-primary-600 select-none">
            <Wallet class="w-6 h-6" />
            <span>AmI<span class="text-slate-900">Underpaid</span></span>
          </div>
        </NuxtLink>

        <!-- Nav -->
        <nav
          class="flex-1 items-center justify-center hidden gap-8 text-sm font-medium md:flex text-slate-600">
          <template v-if="user">
            <NuxtLink to="/admin/seed" class="transition-colors hover:text-primary-600"
              >Seeder</NuxtLink
            >
            <NuxtLink to="/admin/coding-index" class="transition-colors hover:text-primary-600"
              >Coding Index</NuxtLink
            >
          </template>
          <template v-else>
            <a href="/how-it-works" class="transition-colors hover:text-primary-600"
              >How it works</a
            >
            <a href="/data-sources" class="transition-colors hover:text-primary-600"
              >Data Sources</a
            >
            <a href="/about" class="transition-colors hover:text-primary-600">About</a>
          </template>
        </nav>

        <!-- CTA -->
        <div class="flex flex-1 md:flex-0 items-center justify-end gap-4">
          <AmIButton
            v-if="user"
            bg-colour="bg-transparent"
            text-colour="text-slate-600"
            animation-colour="bg-primary-400"
            @click="handleLogout"
            >Sign Out</AmIButton
          >
          <NuxtLink v-else to="/login">
            <AmIButton
              bg-colour="bg-transparent"
              text-colour="text-slate-600"
              animation-colour="bg-primary-400"
              >Sign In</AmIButton
            >
          </NuxtLink>
          <!-- <AmIButton
            bg-colour="bg-primary-900"
            text-colour="text-slate-100"
            animation-colour="bg-primary-600"
            >Post a Job</AmIButton
          > -->
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1">
      <slot />
    </div>

    <!-- Simple Footer -->
    <footer class="py-8 text-sm text-center bg-white border-t border-slate-200 text-slate-400">
      <p>&copy; 2026 Am I Underpaid. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Wallet } from 'lucide-vue-next';
import { useCurrentUser, useFirebaseAuth } from 'vuefire';
import { signOut } from 'firebase/auth';

const user = useCurrentUser();
const auth = useFirebaseAuth();

const handleLogout = async () => {
  if (auth) {
    await signOut(auth);
    await navigateTo('/');
  }
};
</script>
