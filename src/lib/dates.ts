// 날짜 계산·표시. 기준 시간대는 항상 Asia/Seoul (AGENTS.md 규칙).

export const TIME_ZONE = "Asia/Seoul";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 한국 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayInSeoul(now = new Date()): string {
  // en-CA 형식이 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** YYYY-MM-DD 형식이고 실제로 있는 날짜인지 (2026-02-30 같은 값은 거부) */
export function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "2026-11-06" → "2026.11.06 (금)" */
export function formatYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${ymd.replaceAll("-", ".")} (${weekday})`;
}

/** 시각을 한국 시간의 날짜(YYYY-MM-DD)와 시:분(HH:MM)으로 나눈다 */
export function seoulParts(date: Date): { ymd: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** 시각을 한국 시간으로 "2026.11.06 (금) 14:30" */
export function formatDateTime(date: Date): string {
  const { ymd, time } = seoulParts(date);
  return `${formatYmd(ymd)} ${time}`;
}

/** 한국 날짜 + 시:분 → 시각. 한국은 서머타임이 없어 +09:00 고정 */
export function seoulDateTime(ymd: string, time = "00:00"): Date {
  return new Date(`${ymd}T${time}:00+09:00`);
}

/** 두 날짜(YYYY-MM-DD) 사이의 날 수 (to - from) */
export function daysBetween(from: string, to: string): number {
  const ms = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

/** 일정까지 남은 날: "오늘", "D-3", 지났으면 "지남" */
export function dDayLabel(today: string, ymd: string): string {
  const n = daysBetween(today, ymd);
  if (n === 0) return "오늘";
  return n > 0 ? `D-${n}` : "지남";
}

// ---- 주 계산 (일요일 시작) ----

function ymdToUtc(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 날짜 더하기 (n이 음수면 빼기) */
export function addDays(ymd: string, n: number): string {
  const date = ymdToUtc(ymd);
  date.setUTCDate(date.getUTCDate() + n);
  return utcToYmd(date);
}

/** 그 날짜가 들어 있는 주의 일요일 */
export function weekStart(ymd: string): string {
  return addDays(ymd, -ymdToUtc(ymd).getUTCDay());
}

/** 주 시작(일요일)부터 토요일까지 7개 날짜 */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 요일 이름 ("일" ~ "토") */
export function weekdayName(ymd: string): string {
  return WEEKDAYS[ymdToUtc(ymd).getUTCDay()];
}

/** 주 범위 표시: "2026.11.01 – 11.07". 연도가 바뀌면 끝 날짜에도 연도를 붙인다 */
export function formatWeekRange(start: string): string {
  const end = addDays(start, 6);
  const head = start.replaceAll("-", ".");
  const tail = end.slice(0, 4) === start.slice(0, 4) ? end.slice(5).replace("-", ".") : end.replaceAll("-", ".");
  return `${head} – ${tail}`;
}
