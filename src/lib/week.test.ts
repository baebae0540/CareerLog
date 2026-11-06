import { describe, expect, it } from "vitest";
import { buildWeek, isShownStatusChange, moveItem, type WeekEventRow, type WeekStatusRow } from "./week";

const START = "2026-11-01"; // 일요일

function event(over: Partial<WeekEventRow>): WeekEventRow {
  return {
    id: 1,
    applicationId: 10,
    company: "가나다",
    kind: "interview",
    title: "1차 면접",
    startsAt: new Date("2026-11-03T05:00:00Z"), // 한국 11-03 14:00
    allDay: false,
    done: false,
    ...over,
  };
}

function change(over: Partial<WeekStatusRow>): WeekStatusRow {
  return {
    id: 1,
    applicationId: 10,
    company: "가나다",
    fromStatus: "applied",
    toStatus: "document_passed",
    changedOn: "2026-11-02",
    changedAt: new Date("2026-11-02T01:00:00Z"),
    ...over,
  };
}

const empty = { events: [], statusChanges: [], applied: [] };

describe("buildWeek", () => {
  it("일~토 7일을 만든다", () => {
    const { days, summary } = buildWeek(START, empty);
    expect(days.map((d) => d.ymd)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
    expect(days.every((d) => d.items.length === 0)).toBe(true);
    expect(summary).toEqual({ applied: 0, events: 0, eventsDone: 0, statusChanges: 0, offers: 0, rejections: 0 });
  });

  it("일정은 한국 날짜 기준으로 배정한다 (토요일 23:30 KST = UTC 14:30)", () => {
    const { days } = buildWeek(START, { ...empty, events: [event({ startsAt: new Date("2026-11-07T14:30:00Z") })] });
    expect(days[6].items).toHaveLength(1);
    expect(days[6].items[0]).toMatchObject({ type: "event", time: "23:30" });
  });

  it("주 밖의 항목은 버린다", () => {
    const { days, summary } = buildWeek(START, {
      events: [event({ startsAt: new Date("2026-11-07T15:00:00Z") })], // 한국 11-08 00:00
      statusChanges: [change({ changedOn: "2026-10-31" })],
      applied: [{ id: 3, company: "x", position: "y", appliedAt: "2026-11-08" }],
    });
    expect(days.flatMap((d) => d.items)).toHaveLength(0);
    expect(summary.events + summary.statusChanges + summary.applied).toBe(0);
  });

  it("한 날짜 안: 시간 있는 일정(시각 순) → 시간 미정 → 상태 변경 → 신규 지원", () => {
    const { days } = buildWeek(START, {
      events: [
        event({ id: 1, startsAt: new Date("2026-11-02T15:00:00Z"), allDay: true }), // 11-03 시간 미정
        event({ id: 2, startsAt: new Date("2026-11-03T06:00:00Z") }), // 11-03 15:00
        event({ id: 3, startsAt: new Date("2026-11-03T00:30:00Z") }), // 11-03 09:30
      ],
      statusChanges: [change({ id: 5, changedOn: "2026-11-03" })],
      applied: [{ id: 7, company: "라마", position: "백엔드", appliedAt: "2026-11-03" }],
    });
    expect(days[2].items.map((i) => i.key)).toEqual(["e3", "e2", "e1", "s5", "a7"]);
    expect(days[2].items[2]).toMatchObject({ time: null });
  });

  it("최초 등록 이력과 '지원'으로의 변경은 상태 변경에서 뺀다", () => {
    expect(isShownStatusChange({ fromStatus: null, toStatus: "interview" })).toBe(false);
    expect(isShownStatusChange({ fromStatus: "interested", toStatus: "applied" })).toBe(false);
    expect(isShownStatusChange({ fromStatus: "applied", toStatus: "rejected" })).toBe(true);
  });

  it("요약 숫자", () => {
    const { summary } = buildWeek(START, {
      events: [event({ id: 1, done: true }), event({ id: 2 })],
      statusChanges: [
        change({ id: 1, fromStatus: null, toStatus: "applied" }),
        change({ id: 2, fromStatus: "final", toStatus: "offer" }),
        change({ id: 3, fromStatus: "interview", toStatus: "rejected" }),
        change({ id: 4 }),
      ],
      applied: [{ id: 3, company: "x", position: "y", appliedAt: "2026-11-05" }],
    });
    expect(summary).toEqual({ applied: 1, events: 2, eventsDone: 1, statusChanges: 3, offers: 1, rejections: 1 });
  });
});

describe("moveItem (드래그 결과 낙관적 반영)", () => {
  it("일정은 시각을 유지하고 날짜만 옮긴다", () => {
    const data = { ...empty, events: [event({ id: 1 }), event({ id: 2, allDay: true, startsAt: new Date("2026-11-02T15:00:00Z") })] };
    const moved = moveItem(data, { type: "event", id: 1, ymd: "2026-11-06" });
    expect(moved.events[0].startsAt.toISOString()).toBe("2026-11-06T05:00:00.000Z"); // 한국 14:00 유지
    const allDay = moveItem(data, { type: "event", id: 2, ymd: "2026-11-05" });
    expect(allDay.events[1].startsAt.toISOString()).toBe("2026-11-04T15:00:00.000Z"); // 한국 11-05 00:00
    expect(data.events[0].startsAt.toISOString()).toBe("2026-11-03T05:00:00.000Z"); // 원본은 그대로
  });

  it("지원일을 옮기면 지원일을 정한 이력도 따라간다", () => {
    const data = {
      ...empty,
      applied: [{ id: 10, company: "가나다", position: "백엔드", appliedAt: "2026-11-02" }],
      statusChanges: [
        change({ id: 1, fromStatus: "interested", toStatus: "document_passed", changedOn: "2026-11-02" }),
        change({ id: 2, fromStatus: "document_passed", toStatus: "interview", changedOn: "2026-11-02" }),
      ],
    };
    const moved = moveItem(data, { type: "applied", id: 10, ymd: "2026-11-04" });
    expect(moved.applied[0].appliedAt).toBe("2026-11-04");
    expect(moved.statusChanges.map((c) => c.changedOn)).toEqual(["2026-11-04", "2026-11-02"]);
  });

  it("지원일을 정한 이력을 옮기면 지원일도 따라가고, 다른 이력은 지원일을 건드리지 않는다", () => {
    const data = {
      ...empty,
      applied: [{ id: 10, company: "가나다", position: "백엔드", appliedAt: "2026-11-02" }],
      statusChanges: [
        change({ id: 1, fromStatus: "interested", toStatus: "document_passed", changedOn: "2026-11-02" }),
        change({ id: 2, fromStatus: "document_passed", toStatus: "interview", changedOn: "2026-11-03" }),
      ],
    };
    expect(moveItem(data, { type: "status", id: 1, ymd: "2026-11-01" }).applied[0].appliedAt).toBe("2026-11-01");
    const other = moveItem(data, { type: "status", id: 2, ymd: "2026-11-05" });
    expect(other.applied[0].appliedAt).toBe("2026-11-02");
    expect(other.statusChanges[1].changedOn).toBe("2026-11-05");
  });
});
