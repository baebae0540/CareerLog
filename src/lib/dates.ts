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

/** 시각을 한국 시간으로 "2026.11.06 (금) 14:30" */
export function formatDateTime(date: Date): string {
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
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return `${formatYmd(ymd)} ${get("hour")}:${get("minute")}`;
}
