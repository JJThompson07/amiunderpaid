<template>
  <div class="min-h-screen bg-slate-50 p-4 pt-24">
    <SectionSharedBackdrop bg-from="from-slate-500" />
    <NuxtLink
      to="/recruiter/dashboard"
      class="text-slate-200 hover:text-white flex items-center gap-2 text-sm font-bold mb-4 transition-colors w-max relative">
      <ArrowLeft class="w-4 h-4" /> Back to Dashboard
    </NuxtLink>
    <div class="max-w-7xl mx-auto relative bg-white rounded-2xl p-4">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-slate-900">Claim Territories</h1>
        <p class="text-slate-500 mt-1">
          Select an exclusive region and industry to start receiving candidate leads.
        </p>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xs border border-slate-200">
        <p class="text-slate-400 text-center py-12 font-medium">Territory list goes here...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';

// 1. Lock the door to ensure only recruiters can see this page
definePageMeta({
  middleware: ['recruiters']
});

// 2. Your custom data fetching and claiming logic goes below!
</script>
