// 통계 화면의 주별 추이. 주간 화면과 같은 재료(WeekData)를 주 단위로 센다 (순수 함수).
import { addDays, daysBetween, seoulParts } from "./dates";
import { FUNNEL_STAGES } from "./stats";
import { isShownStatusChange, type WeekData } from "./week";

/** 보여줄 주 수 (이번 주 포함) */
export const TREND_WEEKS = 12;

export type TrendMetric = "applied" | "progressed" | "eventsDone";

export const TREND_METRICS: { key: TrendMetric; label: string; hint: string }[] = [
  { key: "applied", label: "신규 지원", hint: "지원일 기준" },
  { key: "progressed", label: "다음 단계 진출", hint: "서류 통과·면접·최종·합격으로 바뀐 날 기준" },
  { key: "eventsDone", label: "완료한 일정", hint: "일정 날짜 기준, 완료 표시한 것" },
];

export type TrendWeek = { start: string } & Record<TrendMetric, number>;

/** 첫 주의 일요일: 이번 주 일요일에서 (weeks - 1)주 전 */
export function trendFrom(thisWeekStart: string, weeks = TREND_WEEKS): string {
  return addDays(thisWeekStart, -7 * (weeks - 1));
}

/**
 * from(일요일)부터 weeks주 동안 주별 숫자. 날짜는 모두 한국 기준.
 * 상태 변경은 주간 화면과 같은 기준(isShownStatusChange) 중 퍼널에서 앞으로 나아간 것(서류 통과 이상)만 센다.
 */
export function buildWeeklyTrend(from: string, weeks: number, data: WeekData): TrendWeek[] {
  const rows: TrendWeek[] = Array.from({ length: weeks }, (_, i) => ({
    start: addDays(from, i * 7),
    applied: 0,
    progressed: 0,
    eventsDone: 0,
  }));
  const at = (ymd: string) => {
    const days = daysBetween(from, ymd);
    return days < 0 ? undefined : rows[Math.floor(days / 7)];
  };
  const forward = new Set<string>(FUNNEL_STAGES.slice(1));

  for (const a of data.applied) {
    const row = at(a.appliedAt);
    if (row) row.applied++;
  }
  for (const c of data.statusChanges) {
    if (!isShownStatusChange(c) || !forward.has(c.toStatus)) continue;
    const row = at(c.changedOn);
    if (row) row.progressed++;
  }
  for (const e of data.events) {
    if (!e.done) continue;
    const row = at(seoulParts(e.startsAt).ymd);
    if (row) row.eventsDone++;
  }
  return rows;
}
