import { describe, expect, it } from "vitest";
import { APPLICATION_CSV_HEADER, applicationsCsv, csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("평범한 값은 그대로, 빈 값은 빈 칸", () => {
    expect(csvCell("토스")).toBe("토스");
    expect(csvCell(null)).toBe("");
  });

  it("쉼표·따옴표·줄바꿈은 따옴표로 감싼다", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('말한 "조건"')).toBe('"말한 ""조건"""');
    expect(csvCell("첫 줄\n둘째 줄")).toBe('"첫 줄\n둘째 줄"');
  });

  it("수식으로 읽힐 값은 앞에 '를 붙인다", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+82")).toBe("'+82");
    expect(csvCell("@me")).toBe("'@me");
    expect(csvCell("-1+2")).toBe("'-1+2");
    expect(csvCell("- 연봉 협의")).toBe("- 연봉 협의");
  });
});

describe("applicationsCsv", () => {
  const base = {
    company: "토스",
    position: "FE",
    appliedAt: "2026-11-09",
    source: "원티드",
    jobUrl: "https://example.com/1",
    memo: "메모, 쉼표",
    // 한국 시간으로 11/10 00:30
    createdAt: new Date("2026-11-09T15:30:00Z"),
    updatedAt: new Date("2026-11-09T15:30:00Z"),
  };

  it("BOM, 머리글, 한국 날짜, CRLF", () => {
    const csv = applicationsCsv([{ ...base, status: "applied" }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      APPLICATION_CSV_HEADER.join(","),
      '토스,FE,지원,2026-11-09,원티드,https://example.com/1,"메모, 쉼표",2026-11-10,2026-11-10',
      "",
    ]);
  });

  it("관심(지원 전)은 지원일을 비운다", () => {
    const line = applicationsCsv([{ ...base, status: "interested" }]).split("\r\n")[1];
    expect(line.startsWith("토스,FE,관심,,원티드")).toBe(true);
  });

  it("행이 없으면 머리글만", () => {
    expect(toCsv([APPLICATION_CSV_HEADER])).toBe("﻿" + APPLICATION_CSV_HEADER.join(",") + "\r\n");
  });
});
