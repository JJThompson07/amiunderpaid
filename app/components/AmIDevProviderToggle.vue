<template>
  <div class="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-3 font-sans">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0">
      <div
        v-if="isOpen"
        class="w-72 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl p-4 border border-slate-200">
        <h4 class="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
          Dev Tools
        </h4>
        <AmITabs
          v-model="override"
          label="Provider Override"
          :options="options"
          bg-colour="bg-slate-100"
          text-colour="text-slate-500"
          hover-colour="hover:text-primary-400"
          button-colour="bg-primary-500"
          button-text-colour="text-white" />
      </div>
    </Transition>

    <button
      class="flex items-center justify-center w-12 h-12 bg-slate-900/80 backdrop-blur-md text-white rounded-full shadow-lg hover:bg-slate-800 hover:scale-105 transition-all focus:outline-none ring-1 ring-white/10"
      aria-label="Toggle Developer Tools"
      @click="isOpen = !isOpen">
      <Settings v-if="!isOpen" class="w-5 h-5" />
      <X v-else class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Settings, X } from 'lucide-vue-next';

const isOpen = ref(false);
const override = useDevProviderOverride();
const { currentCountry } = useRegion();

const options = computed(() => {
  const baseOptions = [
    { label: 'Auto', value: 'auto' },
    { label: 'Adzuna', value: 'adzuna' }
  ];

  if (currentCountry.value === 'USA') {
    baseOptions.push({ label: 'Jooble', value: 'jooble' });
  } else {
    baseOptions.push({ label: 'Reed', value: 'reed' });
  }

  return baseOptions;
});
</script>
