import type { ApplicationStatus } from "@/db/schema";
import { addDays } from "./dates";

/** 퍼널 단계 (앞으로 나아가는 순서). 관심·불합격·보류는 단계가 아니다. */
export const FUNNEL_STAGES = ["applied", "document_passed", "interview", "final", "offer"] as const satisfies readonly ApplicationStatus[];
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type StatsPeriod = "all" | "90d" | "30d";
export const STATS_PERIODS: StatsPeriod[] = ["all", "90d", "30d"];
export const PERIOD_LABEL: Record<StatsPeriod, string> = { all: "전체", "90d": "최근 3개월", "30d": "최근 30일" };

/** ?period= 값 해석. 없으면 전체, 잘못된 값이면 null */
export function parsePeriod(raw: string | string[] | undefined): StatsPeriod | null {
  if (raw === undefined) return "all";
  return typeof raw === "string" && (STATS_PERIODS as string[]).includes(raw) ? (raw as StatsPeriod) : null;
}

/** 기간의 시작일 (지원일이 이 날짜 이상). 전체면 null. 오늘을 포함해 90일·30일 */
export function periodFrom(period: StatsPeriod, today: string): string | null {
  if (period === "90d") return addDays(today, -89);
  if (period === "30d") return addDays(today, -29);
  return null;
}

export type FunnelApp = { id: number; status: ApplicationStatus; source?: string | null };
export type FunnelChange = { applicationId: number; toStatus: ApplicationStatus };

export type FunnelRow = {
  status: FunnelStage;
  count: number;
  /** 이전 단계 대비 비율 (0~1). 첫 단계이거나 분모가 0이면 null */
  fromPrev: number | null;
  /** 지원 대비 비율 (0~1). 지원이 0이면 null */
  fromFirst: number | null;
};

export type Funnel = {
  stages: FunnelRow[];
  /** 현재 상태 요약. 진행 중 = 지원~최종 */
  outcome: { active: number; offer: number; rejected: number; onHold: number };
};

function stageIndex(status: ApplicationStatus): number {
  return (FUNNEL_STAGES as readonly ApplicationStatus[]).indexOf(status);
}

/**
 * 지원 건마다 도달한 가장 높은 단계의 순번(이력의 to_status와 현재 상태 중). 0 = 지원.
 * 단계를 건너뛰어도 앞 단계는 지난 것으로 본다. 불합격·보류가 돼도 도달한 단계는 그대로 둔다.
 * 지원일이 있는 건은 적어도 '지원' 단계에 온 것이다 (지원일을 정하고 바로 불합격·보류로 등록한 경우 포함).
 */
function highestStages(apps: FunnelApp[], changes: FunnelChange[]): Map<number, number> {
  const highest = new Map<number, number>();
  for (const app of apps) highest.set(app.id, Math.max(stageIndex(app.status), 0));
  for (const c of changes) {
    const current = highest.get(c.applicationId);
    if (current === undefined) continue; // 대상이 아닌 지원 건의 이력
    highest.set(c.applicationId, Math.max(current, stageIndex(c.toStatus)));
  }
  return highest;
}

/** 지원 건마다 도달한 가장 높은 단계를 구해 단계별로 센다 */
export function buildFunnel(apps: FunnelApp[], changes: FunnelChange[]): Funnel {
  const reached = [...highestStages(apps, changes).values()];
  const counts = FUNNEL_STAGES.map((_, k) => reached.filter((i) => i >= k).length);
  const first = counts[0];

  const stages = FUNNEL_STAGES.map((status, k) => ({
    status,
    count: counts[k],
    fromPrev: k === 0 || counts[k - 1] === 0 ? null : counts[k] / counts[k - 1],
    fromFirst: first === 0 ? null : counts[k] / first,
  }));

  const outcome = { active: 0, offer: 0, rejected: 0, onHold: 0 };
  for (const app of apps) {
    if (app.status === "offer") outcome.offer++;
    else if (app.status === "rejected") outcome.rejected++;
    else if (app.status === "on_hold") outcome.onHold++;
    else if (stageIndex(app.status) >= 0) outcome.active++;
  }
  return { stages, outcome };
}

export type SourceRow = {
  /** 화면에 보일 경로 이름. 비어 있으면 null (= 미입력) */
  source: string | null;
  total: number;
  documentPassed: number;
  interview: number;
  offer: number;
};

/** 경로 묶음 열쇠: 앞뒤·중복 공백을 정리하고 대소문자를 무시한다. 빈 값은 "" */
function sourceKey(source: string | null | undefined): string {
  return (source ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * 지원 경로별 성과. 퍼널과 같은 '도달한 가장 높은 단계' 기준으로 서류 통과·면접·합격까지 간 건수를 센다.
 * 경로는 공백·대소문자만 맞춰 묶는다 (다른 표기는 합치지 않는다). 이름은 apps에서 처음 나온 표기를 쓴다 (조회는 id 순).
 * 순서: 지원 많은 순 → 이름순, 미입력은 맨 뒤.
 */
export function buildSourceStats(apps: FunnelApp[], changes: FunnelChange[]): SourceRow[] {
  const highest = highestStages(apps, changes);
  const rows = new Map<string, SourceRow>();
  const at = (stage: FunnelStage) => FUNNEL_STAGES.indexOf(stage);

  for (const app of apps) {
    const key = sourceKey(app.source);
    let row = rows.get(key);
    if (!row) {
      row = { source: key ? app.source!.trim().replace(/\s+/g, " ") : null, total: 0, documentPassed: 0, interview: 0, offer: 0 };
      rows.set(key, row);
    }
    const reached = highest.get(app.id) ?? 0;
    row.total++;
    if (reached >= at("document_passed")) row.documentPassed++;
    if (reached >= at("interview")) row.interview++;
    if (reached >= at("offer")) row.offer++;
  }

  return [...rows.values()].sort((a, b) => {
    if ((a.source === null) !== (b.source === null)) return a.source === null ? 1 : -1;
    return b.total - a.total || (a.source ?? "").localeCompare(b.source ?? "", "ko");
  });
}

/** 비율 표시: 0.333 → "33%", null → "–" */
export function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}
