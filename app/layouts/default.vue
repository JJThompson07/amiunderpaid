<template>
  <div class="flex flex-col min-h-screen font-sans text-slate-900 bg-slate-50">
    <!-- Navbar -->
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b bg-white/80 backdrop-blur-md border-slate-200/50">
      <div class="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl">
        <!-- Logo -->
        <div class="flex items-center gap-2 text-xl font-bold tracking-tight text-primary-600">
          <Wallet class="w-6 h-6" />
          <span>AmI<span class="text-slate-900">Underpaid</span></span>
        </div>

        <!-- Nav -->
        <nav class="items-center hidden gap-8 text-sm font-medium md:flex text-slate-600">
          <a href="#" class="transition-colors hover:text-primary-600">How it works</a>
          <a href="#" class="transition-colors hover:text-primary-600">Data Sources</a>
          <a href="#" class="transition-colors hover:text-primary-600">About</a>
        </nav>

        <!-- CTA -->
        <div class="flex items-center gap-4">
          <button class="text-sm font-medium text-slate-600 hover:text-slate-900">Sign In</button>
          <button
            class="px-4 py-2 text-sm font-medium text-white transition-colors bg-slate-900 rounded-lg hover:bg-slate-800">
            Post a Job
          </button>
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
import { Wallet } from 'lucide-vue-next'
</script>
