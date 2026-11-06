// 공통 Tailwind 클래스. 컴포넌트 라이브러리 없이 이 정도만 공유한다.
// 한 줄짜리 입력(입력칸·선택 상자·날짜·버튼)은 모두 높이 h-10으로 맞춘다.

const fieldBase =
  "w-full rounded-lg border border-zinc-300 bg-white text-sm text-zinc-900 shadow-xs outline-none transition-colors " +
  "placeholder:text-zinc-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 " +
  "aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/15 " +
  "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-900/50";

export const inputClass = `${fieldBase} h-10 px-3`;

export const textareaClass = `${fieldBase} min-h-32 px-3 py-2.5 leading-relaxed`;

/** 선택 상자·날짜 선택처럼 버튼으로 여는 입력 */
export const triggerClass =
  `${fieldBase} flex h-10 items-center justify-between gap-2 px-3 text-left ` +
  "data-[placeholder]:text-zinc-400 data-[state=open]:border-blue-500 data-[state=open]:ring-3 data-[state=open]:ring-blue-500/15";

/** 펼쳐지는 목록·달력 상자 */
export const popoverClass =
  "z-50 rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-lg outline-none dark:border-zinc-800 dark:bg-zinc-900";

const buttonBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-60";

export const primaryButtonClass = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700`;

export const secondaryButtonClass =
  `${buttonBase} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 ` +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const dangerButtonClass =
  `${buttonBase} border border-red-300 bg-white text-red-600 hover:bg-red-50 ` +
  "dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950";

/** 작은 텍스트 버튼 (이력 수정·삭제 등) */
export const linkButtonClass =
  "text-xs font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-60 dark:hover:text-zinc-100";

export const cardClass =
  "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
