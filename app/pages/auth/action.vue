<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <AmILoader message="Verifying secure link..." />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';

definePageMeta({
  layout: false
});

const route = useRoute();

onMounted(async () => {
  const mode = route.query.mode as string;
  const oobCode = route.query.oobCode as string;

  // If the link is totally broken or missing the code, send them home
  if (!mode || !oobCode) {
    await navigateTo('/');
    return;
  }

  // The Traffic Cop Logic: Look at the mode and route them accordingly
  switch (mode) {
    case 'verifyEmail':
      // Send them to the page we just built!
      await navigateTo({
        path: '/auth/verify-email',
        query: { mode, oobCode }
      });
      break;

    case 'resetPassword':
      // Send them to the new password reset page we are about to build
      await navigateTo({
        path: '/auth/reset-password',
        query: { mode, oobCode }
      });
      break;

    case 'recoverEmail':
      // This is for if someone changes their email and wants to undo it
      // You can just route this to home for now, or build a page for it later
      await navigateTo('/');
      break;

    default:
      await navigateTo('/');
  }
});
</script>
