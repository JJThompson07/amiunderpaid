<template>
  <Transition
    enter-active-class="transition ease-out duration-500"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-300"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0">
    <div
      v-if="showBanner"
      class="fixed bottom-0 left-0 right-0 z-100 p-4 sm:p-6 bg-slate-900 shadow-2xl border-t border-slate-800">
      <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-sm text-slate-300 leading-relaxed text-center sm:text-left">
          <strong class="text-white text-base">{{ $t('common.cookie.strong') }}</strong
          ><br />
          {{ $t('common.cookie.message') }}
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <button
            class="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
            @click="decline">
            {{ $t('common.cookie.decline') }}
          </button>
          <button
            class="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-slate-900 bg-primary-400 hover:bg-primary-300 rounded-lg transition-colors"
            @click="accept">
            {{ $t('common.cookie.accept') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const { analyticsConsent } = useAnalytics();
const showBanner = ref(false);

onMounted(() => {
  // Only show the banner if the cookie is completely empty/null
  if (analyticsConsent.value === null) {
    // Add a tiny delay so it slides in smoothly after page load
    setTimeout(() => {
      showBanner.value = true;
    }, 500);
  }
});

const accept = () => {
  analyticsConsent.value = 'granted';
  showBanner.value = false;
};

const decline = () => {
  analyticsConsent.value = 'denied';
  showBanner.value = false;
};
</script>
