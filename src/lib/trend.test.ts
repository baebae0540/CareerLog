import { describe, expect, it } from "vitest";
import { seoulDateTime } from "./dates";
import { buildWeeklyTrend, trendFrom } from "./trend";
import type { WeekData, WeekEventRow, WeekStatusRow } from "./week";

const empty: WeekData = { events: [], statusChanges: [], applied: [] };
const event = (startsAt: Date, done: boolean): WeekEventRow => ({
  id: 1, applicationId: 1, company: "회사", kind: "interview", title: "면접", startsAt, allDay: false, done,
});
const change = (changedOn: string, fromStatus: WeekStatusRow["fromStatus"], toStatus: WeekStatusRow["toStatus"]): WeekStatusRow => ({
  id: 1, applicationId: 1, company: "회사", fromStatus, toStatus, changedOn, changedAt: new Date(),
});

describe("trendFrom", () => {
  it("이번 주 일요일에서 11주 전 일요일 (12주)", () => {
    expect(trendFrom("2026-11-08")).toBe("2026-08-23");
    expect(trendFrom("2026-11-08", 1)).toBe("2026-11-08");
  });
});

describe("buildWeeklyTrend", () => {
  it("빈 주도 0으로 채운 weeks개의 줄, 주 시작은 일요일", () => {
    const rows = buildWeeklyTrend("2026-10-25", 3, empty);
    expect(rows).toEqual([
      { start: "2026-10-25", applied: 0, progressed: 0, eventsDone: 0 },
      { start: "2026-11-01", applied: 0, progressed: 0, eventsDone: 0 },
      { start: "2026-11-08", applied: 0, progressed: 0, eventsDone: 0 },
    ]);
  });

  it("신규 지원은 지원일의 주, 범위 밖은 버린다", () => {
    const rows = buildWeeklyTrend("2026-10-25", 2, {
      ...empty,
      applied: [
        { id: 1, company: "a", position: "p", appliedAt: "2026-10-24" }, // 범위 전 (토)
        { id: 2, company: "a", position: "p", appliedAt: "2026-10-25" }, // 첫 주 일요일
        { id: 3, company: "a", position: "p", appliedAt: "2026-10-31" }, // 첫 주 토요일
        { id: 4, company: "a", position: "p", appliedAt: "2026-11-01" }, // 둘째 주
        { id: 5, company: "a", position: "p", appliedAt: "2026-11-08" }, // 범위 뒤
      ],
    });
    expect(rows.map((r) => r.applied)).toEqual([2, 1]);
  });

  it("상태 변경은 서류 통과 이상으로 나아간 것만 (최초 등록·지원·불합격·보류 제외)", () => {
    const rows = buildWeeklyTrend("2026-11-01", 1, {
      ...empty,
      statusChanges: [
        change("2026-11-02", null, "interview"), // 최초 등록
        change("2026-11-02", "interested", "applied"),
        change("2026-11-03", "applied", "document_passed"),
        change("2026-11-04", "document_passed", "interview"),
        change("2026-11-05", "final", "offer"),
        change("2026-11-06", "interview", "rejected"),
        change("2026-11-06", "applied", "on_hold"),
      ],
    });
    expect(rows[0].progressed).toBe(3);
  });

  it("완료한 일정만, 한국 날짜로 주를 정한다 (토 23:30 / 일 00:00 경계)", () => {
    const rows = buildWeeklyTrend("2026-11-01", 2, {
      ...empty,
      events: [
        event(seoulDateTime("2026-11-07", "23:30"), true), // 첫 주 토요일
        event(seoulDateTime("2026-11-08", "00:00"), true), // 둘째 주 일요일
        event(seoulDateTime("2026-11-08", "10:00"), false), // 미완료
      ],
    });
    expect(rows.map((r) => r.eventsDone)).toEqual([1, 1]);
  });
});
