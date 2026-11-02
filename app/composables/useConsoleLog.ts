import { nextTick, ref } from 'vue';

type UseConsoleLogReturn = {
  status: Ref<string>;
  consoleRef: Ref<HTMLElement | null>;
  log: (msg: string) => void;
  logProgress: (msg: string) => void;
  clearLog: () => void;
};

export const useConsoleLog = (): UseConsoleLogReturn => {
  const status = ref('');
  const consoleRef = ref<HTMLElement | null>(null);
  // where the current progress line starts in `status`, so the next update can replace it
  let progressLineStart: number | null = null;

  const scrollToBottom = (): void => {
    nextTick(() => {
      if (consoleRef.value) {
        consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
      }
    });
  };

  const log = (msg: string): void => {
    progressLineStart = null;
    status.value += `> ${msg}\n`;
    scrollToBottom();
  };

  // rewrites the previous progress line in place instead of appending one line per update
  const logProgress = (msg: string): void => {
    if (progressLineStart !== null) {
      status.value = status.value.slice(0, progressLineStart);
    }
    progressLineStart = status.value.length;
    status.value += `> ${msg}\n`;
    scrollToBottom();
  };

  const clearLog = (): void => {
    progressLineStart = null;
    status.value = '';
  };

  return {
    status,
    consoleRef,
    log,
    logProgress,
    clearLog
  };
};
