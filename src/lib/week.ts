// 주간 캘린더용 묶기. 조회 결과를 날짜별 항목과 요약 숫자로 바꾼다 (순수 함수).
import type { ApplicationStatus, EventKind } from "@/db/schema";
import { seoulDateTime, seoulParts, weekDays } from "./dates";

export type WeekEventRow = {
  id: number;
  applicationId: number;
  company: string;
  kind: EventKind;
  title: string;
  startsAt: Date;
  allDay: boolean;
  done: boolean;
};

export type WeekStatusRow = {
  id: number;
  applicationId: number;
  company: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedOn: string;
  changedAt: Date;
};

export type WeekAppliedRow = {
  id: number;
  company: string;
  position: string;
  appliedAt: string;
};

export type WeekData = { events: WeekEventRow[]; statusChanges: WeekStatusRow[]; applied: WeekAppliedRow[] };

export type WeekItemType = "event" | "status" | "applied";

// id: 일정 id / 이력 id / 지원 건 id
type ItemBase = { key: string; id: number; applicationId: number; company: string; ymd: string };

export type WeekItem =
  | (ItemBase & { type: "event"; kind: EventKind; title: string; time: string | null; done: boolean })
  | (ItemBase & { type: "status"; from: ApplicationStatus; to: ApplicationStatus })
  | (ItemBase & { type: "applied"; position: string });

/** 드래그로 옮기기: 어떤 항목을 어느 날짜로 */
export type WeekMove = { type: WeekItemType; id: number; ymd: string };

export type WeekDay = { ymd: string; items: WeekItem[] };

export type WeekSummary = {
  applied: number;
  events: number;
  eventsDone: number;
  statusChanges: number;
  offers: number;
  rejections: number;
};

/** 주간 화면에 보여줄 상태 변경인가. 최초 등록 이력과 '지원'으로의 변경(신규 지원으로 보임)은 뺀다 */
export function isShownStatusChange(row: Pick<WeekStatusRow, "fromStatus" | "toStatus">): boolean {
  return row.fromStatus !== null && row.toStatus !== "applied";
}

export function buildWeek(start: string, data: WeekData): { days: WeekDay[]; summary: WeekSummary } {
  const days = weekDays(start).map((ymd) => ({ ymd, items: [] as WeekItem[] }));
  const byYmd = new Map(days.map((d) => [d.ymd, d.items]));
  const summary: WeekSummary = { applied: 0, events: 0, eventsDone: 0, statusChanges: 0, offers: 0, rejections: 0 };

  // 1) 일정: 시간 있는 것(시각 순) → 시간 미정
  const events = [...data.events].sort(
    (a, b) => Number(a.allDay) - Number(b.allDay) || a.startsAt.getTime() - b.startsAt.getTime() || a.id - b.id,
  );
  for (const e of events) {
    const { ymd, time } = seoulParts(e.startsAt);
    const items = byYmd.get(ymd);
    if (!items) continue;
    items.push({
      type: "event",
      key: `e${e.id}`,
      id: e.id,
      ymd,
      applicationId: e.applicationId,
      company: e.company,
      kind: e.kind,
      title: e.title,
      time: e.allDay ? null : time,
      done: e.done,
    });
    summary.events++;
    if (e.done) summary.eventsDone++;
  }

  // 2) 상태 변경: 기록한 순서대로
  const changes = data.statusChanges
    .filter(isShownStatusChange)
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime() || a.id - b.id);
  for (const c of changes) {
    const items = byYmd.get(c.changedOn);
    if (!items) continue;
    items.push({
      type: "status",
      key: `s${c.id}`,
      id: c.id,
      ymd: c.changedOn,
      applicationId: c.applicationId,
      company: c.company,
      from: c.fromStatus!,
      to: c.toStatus,
    });
    summary.statusChanges++;
    if (c.toStatus === "offer") summary.offers++;
    if (c.toStatus === "rejected") summary.rejections++;
  }

  // 3) 신규 지원
  for (const a of [...data.applied].sort((x, y) => x.id - y.id)) {
    const items = byYmd.get(a.appliedAt);
    if (!items) continue;
    items.push({
      type: "applied",
      key: `a${a.id}`,
      id: a.id,
      applicationId: a.id,
      company: a.company,
      position: a.position,
      ymd: a.appliedAt,
    });
    summary.applied++;
  }

  return { days, summary };
}

/** 지원일을 정한 이력인가 (첫 등록 또는 관심에서 넘어온 변경). statements.ts의 동기화 조건과 같다 */
function setsAppliedDate(c: WeekStatusRow): boolean {
  return c.toStatus !== "interested" && (c.fromStatus === null || c.fromStatus === "interested");
}

/**
 * 드래그 결과를 화면 데이터에 먼저 반영한다 (서버 저장 전 낙관적 표시).
 * 서버 SQL과 같은 규칙: 일정은 시각을 유지하고 날짜만, 지원일과 그 지원일을 정한 이력은 함께 옮긴다.
 */
export function moveItem(data: WeekData, move: WeekMove): WeekData {
  const { type, id, ymd } = move;

  if (type === "event") {
    return {
      ...data,
      events: data.events.map((e) =>
        e.id === id ? { ...e, startsAt: seoulDateTime(ymd, e.allDay ? "00:00" : seoulParts(e.startsAt).time) } : e,
      ),
    };
  }

  if (type === "status") {
    const target = data.statusChanges.find((c) => c.id === id);
    if (!target) return data;
    const app = data.applied.find((a) => a.id === target.applicationId);
    const syncApplied = setsAppliedDate(target) && app?.appliedAt === target.changedOn;
    return {
      ...data,
      statusChanges: data.statusChanges.map((c) => (c.id === id ? { ...c, changedOn: ymd } : c)),
      applied: syncApplied ? data.applied.map((a) => (a.id === app.id ? { ...a, appliedAt: ymd } : a)) : data.applied,
    };
  }

  const app = data.applied.find((a) => a.id === id);
  if (!app) return data;
  return {
    ...data,
    applied: data.applied.map((a) => (a.id === id ? { ...a, appliedAt: ymd } : a)),
    statusChanges: data.statusChanges.map((c) =>
      c.applicationId === id && setsAppliedDate(c) && c.changedOn === app.appliedAt ? { ...c, changedOn: ymd } : c,
    ),
  };
}
