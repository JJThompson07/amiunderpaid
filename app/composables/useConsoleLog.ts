import { nextTick, ref } from 'vue';

type UseConsoleLogReturn = {
  status: Ref<string>;
  consoleRef: Ref<HTMLElement | null>;
  log: (msg: string) => void;
  clearLog: () => void;
};

export const useConsoleLog = (): UseConsoleLogReturn => {
  const status = ref('');
  const consoleRef = ref<HTMLElement | null>(null);

  const log = (msg: string): void => {
    status.value += `> ${msg}\n`;
    nextTick(() => {
      if (consoleRef.value) {
        consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
      }
    });
  };

  const clearLog = (): void => {
    status.value = '';
  };

  return {
    status,
    consoleRef,
    log,
    clearLog
  };
};
