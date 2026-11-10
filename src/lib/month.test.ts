import { describe, expect, it } from "vitest";
import { addMonths, formatMonth, monthWeeks, parseMonth, summarizeMonth } from "./month";
import type { WeekDay } from "./week";

describe("parseMonth", () => {
  it("없으면 이번 달, 올바른 값은 그대로, 틀리면 null", () => {
    expect(parseMonth(undefined, "2026-11")).toBe("2026-11");
    expect(parseMonth("2027-01", "2026-11")).toBe("2027-01");
    for (const bad of ["2026-13", "2026-00", "2026-1", "26-11", "2026-11-01", "abc", "1999-12"]) {
      expect(parseMonth(bad, "2026-11")).toBeNull();
    }
    expect(parseMonth(["2026-11", "2026-12"], "2026-11")).toBeNull();
  });
});

describe("addMonths·formatMonth", () => {
  it("연도를 넘는다", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-11", -13)).toBe("2025-10");
  });
  it("표시", () => {
    expect(formatMonth("2026-03")).toBe("2026년 3월");
  });
});

describe("monthWeeks", () => {
  it("1일이 일요일인 달 (2026-11: 5주)", () => {
    expect(monthWeeks("2026-11")).toEqual(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
  });
  it("1일이 토요일인 31일 달은 6주 (2026-08)", () => {
    const w = monthWeeks("2026-08");
    expect(w).toHaveLength(6);
    expect(w[0]).toBe("2026-07-26");
    expect(w[5]).toBe("2026-08-30");
  });
  it("일요일에 시작하는 28일 2월은 딱 4주 (2026-02), 윤년 2월 (2028-02)", () => {
    expect(monthWeeks("2026-02")).toEqual(["2026-02-01", "2026-02-08", "2026-02-15", "2026-02-22"]);
    expect(monthWeeks("2028-02").at(-1)).toBe("2028-02-27"); // 2/29(화)가 든 주
  });
});

describe("summarizeMonth", () => {
  it("이번 달 날짜만 센다", () => {
    const base = { id: 1, applicationId: 1, company: "회사" };
    const days: WeekDay[] = [
      { ymd: "2026-10-31", items: [{ ...base, key: "a1", type: "applied", ymd: "2026-10-31", position: "p" }] },
      {
        ymd: "2026-11-02",
        items: [
          { ...base, key: "a2", type: "applied", ymd: "2026-11-02", position: "p" },
          { ...base, key: "e1", type: "event", ymd: "2026-11-02", kind: "interview", title: "t", time: null, done: true },
          { ...base, key: "e2", type: "event", ymd: "2026-11-02", kind: "other", title: "t", time: "10:00", done: false },
          { ...base, key: "s1", type: "status", ymd: "2026-11-02", from: "final", to: "offer" },
          { ...base, key: "s2", type: "status", ymd: "2026-11-02", from: "applied", to: "rejected" },
          { ...base, key: "s3", type: "status", ymd: "2026-11-02", from: "applied", to: "interview" },
        ],
      },
    ];
    expect(summarizeMonth("2026-11", days)).toEqual({
      applied: 1, events: 2, eventsDone: 1, statusChanges: 3, offers: 1, rejections: 1,
    });
  });
});
