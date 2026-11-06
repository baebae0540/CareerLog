import { describe, expect, it } from "vitest";
import { formatDateTime, formatYmd, isValidYmd, todayInSeoul } from "./dates";

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
