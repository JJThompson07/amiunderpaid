<template>
  <div class="min-h-screen pt-24 pb-12 bg-slate-50">
    <div class="max-w-3xl px-4 mx-auto">
      <!-- Header -->
      <div class="mb-12 text-center">
        <h1 class="text-3xl font-black text-slate-900 md:text-4xl">How It Works</h1>
        <p class="mt-4 text-lg text-slate-500">
          We calculate your salary potential in three simple steps.
        </p>
      </div>

      <!-- Steps Grid -->
      <div
        class="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        <!-- Step 1 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-slate-300 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <span class="font-bold text-white">1</span>
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">Enter Your Role</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              Tell us your job title, location, and current salary. Our smart autocomplete helps you
              match standard industry roles for better accuracy.
            </p>
          </div>
        </div>

        <!-- Step 2 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-indigo-600 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <Database class="w-5 h-5 text-white" />
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">We Check the Data</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              We query our live database of over 140,000+ recent salary benchmarks, sourced from
              government data (ONS, US BLS).
              <br />

              <span
                class="font-bold text-secondary-600 uppercase text-2xs tracking-wide bg-secondary-50 px-2 py-0.5 rounded-full mr-1"
                >Coming Soon</span
              >
              live job listings (Adzuna).
            </p>
          </div>
        </div>

        <!-- Step 3 -->
        <div
          class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div
            class="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border border-white bg-emerald-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <Check class="w-5 h-5 text-white" />
          </div>
          <div
            class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">Get Your Verdict</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              Find out instantly if you are underpaid, fairly paid, or leading the market. We'll
              even give you a custom script to negotiate a raise.
            </p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-16 text-center">
        <NuxtLink to="/">
          <AmIButton title="Go to salary search" size="lg">Check My Salary Now</AmIButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ** imports **
import { Database, Check } from 'lucide-vue-next';
</script>
