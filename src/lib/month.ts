// 월간 달력 계산 (일요일 시작, 순수 함수). 월은 "YYYY-MM" 문자열로 다룬다.
import { addDays, daysBetween, weekStart } from "./dates";
import type { WeekDay, WeekSummary } from "./week";

/** 날짜(YYYY-MM-DD)가 속한 월 */
export function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

/** ?m= 값 해석. 없으면 thisMonth, 형식이 틀리면 null */
export function parseMonth(raw: string | string[] | undefined, thisMonth: string): string | null {
  if (raw === undefined) return thisMonth;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const [y, m] = raw.split("-").map(Number);
  return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 ? raw : null;
}

/** 월 더하기 (n이 음수면 빼기) */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`;
}

/** "2026-11" → "2026년 11월" */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/** 달력에 그릴 주들의 일요일. 1일이 든 주부터 말일이 든 주까지 (4~6주) */
export function monthWeeks(ym: string): string[] {
  const first = weekStart(`${ym}-01`);
  const lastDay = addDays(`${addMonths(ym, 1)}-01`, -1);
  const count = daysBetween(first, weekStart(lastDay)) / 7 + 1;
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/** 월 요약 숫자. 달력에 함께 보이는 앞뒤 달의 날짜는 세지 않는다 (주간 요약과 같은 항목) */
export function summarizeMonth(ym: string, days: WeekDay[]): WeekSummary {
  const s: WeekSummary = { applied: 0, events: 0, eventsDone: 0, statusChanges: 0, offers: 0, rejections: 0 };
  for (const day of days) {
    if (monthOf(day.ymd) !== ym) continue;
    for (const item of day.items) {
      if (item.type === "applied") s.applied++;
      else if (item.type === "event") {
        s.events++;
        if (item.done) s.eventsDone++;
      } else {
        s.statusChanges++;
        if (item.to === "offer") s.offers++;
        if (item.to === "rejected") s.rejections++;
      }
    }
  }
  return s;
}
