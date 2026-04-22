<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
    <div
      class="absolute top-0 left-0 w-full h-100 bg-linear-to-b from-secondary-900 to-slate-50 z-0"></div>

    <div class="relative z-10 w-full max-w-md">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 mb-6 text-sm font-semibold transition-colors text-slate-300 hover:text-white">
        <ArrowLeft class="w-4 h-4" />
        {{ $t('login.common.back-to-search') }}
      </NuxtLink>

      <div class="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-2xl">
        <div class="mb-8 text-center">
          <div
            class="w-16 h-16 bg-secondary-50 rounded-2xl flex items-center justify-center text-primary-600 mx-auto mb-4 border border-secondary-100">
            <component :is="!isLogin && signupIcon ? signupIcon : icon" class="w-8 h-8" />
          </div>
          <h1 class="text-2xl font-black text-slate-900">
            {{ isLogin ? title : signupTitle }}
          </h1>
          <p class="text-slate-500 text-sm mt-1">
            {{ isLogin ? subtitle : signupSubtitle }}
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <AmIInputGeneric
            v-model="email"
            :label="emailLabel"
            :placeholder="emailPlaceholder"
            :icon="Mail" />

          <AmIInputGeneric
            v-model="password"
            type="password"
            :label="$t('login.common.password-label')"
            :placeholder="$t('login.common.password-placeholder')"
            :icon="KeyRound"
            @keyup.enter="handleSubmit" />

          <div v-if="isLogin" class="flex justify-end -mt-3">
            <button
              type="button"
              class="text-xs font-bold text-slate-400 hover:text-primary-600 transition-colors"
              @click="showResetModal = true">
              {{ $t('login.common.forgot-password') }}
            </button>
          </div>
          <div
            v-if="error"
            class="text-[11px] font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
            {{ error }}
          </div>

          <div class="pt-2">
            <AmIAnimatedBorder :loading="loading" active-bg-colour="bg-slate-400">
              <AmIButton
                :title="isLogin ? 'login' : 'signup'"
                block
                :disabled="loading"
                type="submit"
                @click.prevent="handleSubmit">
                <div class="flex items-center justify-center gap-2">
                  <span
                    v-if="loading"
                    class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>
                    {{
                      loading
                        ? isLogin
                          ? $t('login.common.loading-verify')
                          : $t('login.common.loading-process')
                        : isLogin
                          ? $t('login.common.sign-in-btn')
                          : $t('login.common.sign-up-btn')
                    }}
                  </span>
                </div>
              </AmIButton>
            </AmIAnimatedBorder>
          </div>
        </form>

        <div v-if="allowSignup" class="mt-8 text-center">
          <button
            type="button"
            class="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors"
            @click="toggleMode">
            {{ isLogin ? toggleSignupText : toggleLoginText }}
          </button>
        </div>

        <p class="mt-8 text-center text-2xs text-slate-400 uppercase tracking-widest font-bold">
          {{ footerText }}
        </p>
      </div>
    </div>
    <ModalForgotPassword v-model="showResetModal" :initial-email="email" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Mail, KeyRound, ArrowLeft } from 'lucide-vue-next';

// Much cleaner props now that the common texts are handled by i18n directly!
defineProps({
  icon: { type: [Object, Function], required: true },
  signupIcon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  signupTitle: { type: String, default: '' },
  signupSubtitle: { type: String, default: '' },
  emailLabel: { type: String, required: true },
  emailPlaceholder: { type: String, required: true },
  toggleSignupText: { type: String, default: '' },
  toggleLoginText: { type: String, default: '' },
  footerText: { type: String, required: true },
  allowSignup: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
});

const emit = defineEmits(['login', 'signup', 'clearError']);
const email = ref<string>('');
const password = ref<string>('');
const isLogin = ref<boolean>(true);
const showResetModal = ref<boolean>(false);

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  emit('clearError');
};

const handleSubmit = () => {
  if (isLogin.value) emit('login', { email: email.value, password: password.value });
  else emit('signup', { email: email.value, password: password.value });
};
</script>
