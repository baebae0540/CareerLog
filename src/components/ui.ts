// 공통 Tailwind 클래스. 컴포넌트 라이브러리 없이 이 정도만 공유한다.

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const dangerButtonClass =
  "inline-flex items-center justify-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950";

export const cardClass =
  "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
