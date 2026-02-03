import { ref, nextTick } from 'vue';

export const useConsoleLog = () => {
  const status = ref('');
  const consoleRef = ref<HTMLElement | null>(null);

  const log = (msg: string) => {
    status.value += `> ${msg}\n`;
    nextTick(() => {
      if (consoleRef.value) consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    });
  };

  const clearLog = () => {
    status.value = '';
  };

  return {
    status,
    consoleRef,
    log,
    clearLog,
  };
};
