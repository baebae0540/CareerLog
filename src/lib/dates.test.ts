import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dDayLabel,
  formatDateTime,
  formatWeekRange,
  formatYmd,
  isValidYmd,
  seoulDateTime,
  seoulParts,
  todayInSeoul,
  weekdayName,
  weekDays,
  weekStart,
} from "./dates";

describe("todayInSeoul", () => {
  it("UTC로는 전날이어도 한국 날짜를 돌려준다", () => {
    // UTC 11-05 15:30 = 한국 11-06 00:30
    expect(todayInSeoul(new Date("2026-11-05T15:30:00Z"))).toBe("2026-11-06");
  });
  it("한국 자정 직전은 그날이다", () => {
    expect(todayInSeoul(new Date("2026-11-06T14:59:59Z"))).toBe("2026-11-06");
  });
});

describe("isValidYmd", () => {
  it("올바른 날짜", () => {
    expect(isValidYmd("2026-11-06")).toBe(true);
    expect(isValidYmd("2028-02-29")).toBe(true); // 윤년
  });
  it("없는 날짜·형식 오류는 거부", () => {
    expect(isValidYmd("2026-02-30")).toBe(false);
    expect(isValidYmd("2027-02-29")).toBe(false);
    expect(isValidYmd("2026-13-01")).toBe(false);
    expect(isValidYmd("2026-1-6")).toBe(false);
    expect(isValidYmd("")).toBe(false);
  });
});

describe("표시 형식", () => {
  it("formatYmd는 요일을 붙인다", () => {
    expect(formatYmd("2026-11-06")).toBe("2026.11.06 (금)");
    expect(formatYmd("2026-11-09")).toBe("2026.11.09 (월)");
  });
  it("formatDateTime은 한국 시간으로 보여준다", () => {
    expect(formatDateTime(new Date("2026-11-05T15:30:00Z"))).toBe("2026.11.06 (금) 00:30");
  });
});

describe("일정 시각", () => {
  it("seoulDateTime은 한국 시간으로 해석한다", () => {
    expect(seoulDateTime("2026-11-10", "09:30").toISOString()).toBe("2026-11-10T00:30:00.000Z");
    expect(seoulDateTime("2026-11-10").toISOString()).toBe("2026-11-09T15:00:00.000Z");
  });
  it("seoulParts는 seoulDateTime을 되돌린다", () => {
    expect(seoulParts(seoulDateTime("2026-11-10", "23:59"))).toEqual({ ymd: "2026-11-10", time: "23:59" });
    expect(seoulParts(seoulDateTime("2026-11-10"))).toEqual({ ymd: "2026-11-10", time: "00:00" });
  });
  it("dDayLabel", () => {
    expect(dDayLabel("2026-11-07", "2026-11-07")).toBe("오늘");
    expect(dDayLabel("2026-11-07", "2026-11-10")).toBe("D-3");
    expect(dDayLabel("2026-11-07", "2026-11-06")).toBe("지남");
    expect(dDayLabel("2026-12-30", "2027-01-02")).toBe("D-3"); // 해 넘김
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); // 윤년
  });
});

describe("주 계산 (일요일 시작)", () => {
  it("weekStart: 일요일은 자기 자신, 토요일은 그 주 일요일", () => {
    expect(weekStart("2026-11-01")).toBe("2026-11-01"); // 일
    expect(weekStart("2026-11-07")).toBe("2026-11-01"); // 토
    expect(weekStart("2026-11-04")).toBe("2026-11-01"); // 수
  });
  it("weekStart: 월·연도를 넘는다", () => {
    expect(weekStart("2026-12-01")).toBe("2026-11-29");
    expect(weekStart("2027-01-01")).toBe("2026-12-27");
  });
  it("addDays: 윤년 2월과 연말", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-12-27", 7)).toBe("2027-01-03");
    expect(addDays("2026-11-01", -7)).toBe("2026-10-25");
  });
  it("weekDays는 일~토 7일", () => {
    const days = weekDays("2026-11-29");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-11-29");
    expect(days[6]).toBe("2026-12-05");
    expect(days.map(weekdayName)).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });
  it("formatWeekRange", () => {
    expect(formatWeekRange("2026-11-01")).toBe("2026.11.01 – 11.07");
    expect(formatWeekRange("2026-11-29")).toBe("2026.11.29 – 12.05");
    expect(formatWeekRange("2026-12-27")).toBe("2026.12.27 – 2027.01.02");
  });
});
