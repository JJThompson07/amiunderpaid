<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-3xl px-4 mx-auto">
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">Our Data Sources</h1>
        <p class="mt-4 text-lg text-slate-500">
          We combine official government statistics with real-time market data to give you the most
          accurate benchmark.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Source 1: Adzuna (Primary for MVP) -->
        <div
          class="p-6 bg-slate-50 border border-slate-200 border-dashed shadow-none rounded-2xl opacity-75">
          <div
            class="absolute top-0 right-0 px-3 py-1 bg-secondary-100 text-secondary-700 text-xs font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1 animate-pulse">
            Live Data
          </div>
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-4">
            <Search class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-slate-900">Adzuna Intelligence</h3>
          <p class="mt-2 text-sm text-slate-500">
            <span
              class="font-bold text-secondary-600 uppercase text-[10px] tracking-wide bg-secondary-50 px-2 py-0.5 rounded-full mr-1"
              >Coming Soon</span
            >
            Our primary source for real-time market shifts. We aggregate data from millions of live
            job listings to see exactly what employers are offering <em>right now</em>.
          </p>
        </div>

        <!-- Source 2: ONS -->
        <div class="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-primary-600 mb-4">
            <Building2 class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-slate-900">ONS (UK Government)</h3>
          <p class="mt-2 text-sm text-slate-500">
            Official labour market statistics from the Office for National Statistics (Annual Survey
            of Hours and Earnings), providing the definitive historical benchmark for UK salaries.
          </p>
        </div>

        <!-- Source 3: BLS -->
        <div class="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600 mb-4">
            <Flag class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-slate-900">US Bureau of Labour Statistics</h3>
          <p class="mt-2 text-sm text-slate-500">
            Comprehensive wage data from the BLS Occupational Employment and Wage Statistics (OEWS)
            program, ensuring accuracy for our US-based benchmarks.
          </p>
        </div>

        <!-- Source 4: Coming Soon -->
        <div
          class="p-6 bg-slate-50 border border-slate-200 border-dashed shadow-none rounded-2xl opacity-75">
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 mb-4">
            <Users class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-bold text-slate-700">Crowdsourced Data</h3>
          <p class="mt-2 text-sm text-slate-500">
            <span
              class="font-bold text-secondary-600 uppercase text-[10px] tracking-wide bg-secondary-50 px-2 py-0.5 rounded-full mr-1"
              >Coming Soon</span
            >
            We are building a verified database of anonymous salary submissions from professionals
            like you to further refine our models.
          </p>
        </div>
      </div>

      <div class="mt-12 p-6 bg-slate-100 rounded-xl text-center">
        <p class="text-sm font-medium text-slate-600">
          Last Database Update: <span class="font-bold text-secondary-600">February 2026</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { Building2, Search, Users, Flag } from 'lucide-vue-next';
</script>
