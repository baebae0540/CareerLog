import { describe, expect, it } from "vitest";
import { buildFunnel, buildSourceStats, formatRate, parsePeriod, periodFrom } from "./stats";

const counts = (f: ReturnType<typeof buildFunnel>) => f.stages.map((s) => s.count);

describe("buildFunnel", () => {
  it("이력과 현재 상태 중 가장 높은 단계까지 센다", () => {
    const f = buildFunnel(
      [
        { id: 1, status: "applied" },
        { id: 2, status: "interview" },
        { id: 3, status: "offer" },
      ],
      [
        { applicationId: 2, toStatus: "applied" },
        { applicationId: 2, toStatus: "document_passed" },
        { applicationId: 2, toStatus: "interview" },
      ],
    );
    expect(counts(f)).toEqual([3, 2, 2, 1, 1]);
  });

  it("단계를 건너뛰어도 앞 단계는 지난 것으로 본다", () => {
    const f = buildFunnel([{ id: 1, status: "interview" }], [{ applicationId: 1, toStatus: "applied" }]);
    expect(counts(f)).toEqual([1, 1, 1, 0, 0]);
  });

  it("면접까지 갔다가 불합격이면 면접 단계까지 센다", () => {
    const f = buildFunnel(
      [{ id: 1, status: "rejected" }],
      [
        { applicationId: 1, toStatus: "applied" },
        { applicationId: 1, toStatus: "interview" },
        { applicationId: 1, toStatus: "rejected" },
      ],
    );
    expect(counts(f)).toEqual([1, 1, 1, 0, 0]);
    expect(f.outcome).toEqual({ active: 0, offer: 0, rejected: 1, onHold: 0 });
  });

  it("지원일만 있고 바로 보류·불합격이어도 지원 단계에는 들어간다", () => {
    const f = buildFunnel(
      [
        { id: 1, status: "on_hold" },
        { id: 2, status: "rejected" },
      ],
      [],
    );
    expect(counts(f)).toEqual([2, 0, 0, 0, 0]);
    expect(f.outcome).toEqual({ active: 0, offer: 0, rejected: 1, onHold: 1 });
  });

  it("대상이 아닌 지원 건의 이력은 무시한다", () => {
    const f = buildFunnel([{ id: 1, status: "applied" }], [{ applicationId: 99, toStatus: "offer" }]);
    expect(counts(f)).toEqual([1, 0, 0, 0, 0]);
  });

  it("전환율: 이전 단계 대비와 지원 대비, 분모가 0이면 null", () => {
    const f = buildFunnel(
      [
        { id: 1, status: "applied" },
        { id: 2, status: "applied" },
        { id: 3, status: "applied" },
        { id: 4, status: "document_passed" },
      ],
      [],
    );
    expect(f.stages[0]).toMatchObject({ fromPrev: null, fromFirst: 1 });
    expect(f.stages[1]).toMatchObject({ count: 1, fromPrev: 0.25, fromFirst: 0.25 });
    expect(f.stages[2]).toMatchObject({ count: 0, fromPrev: 0 });
    expect(f.stages[3]).toMatchObject({ count: 0, fromPrev: null });
    expect(f.outcome.active).toBe(4);
  });

  it("지원 건이 없으면 모두 0, 비율은 null", () => {
    const f = buildFunnel([], []);
    expect(counts(f)).toEqual([0, 0, 0, 0, 0]);
    expect(f.stages.every((s) => s.fromPrev === null && s.fromFirst === null)).toBe(true);
  });
});

describe("기간", () => {
  it("parsePeriod: 없으면 전체, 잘못된 값이면 null", () => {
    expect(parsePeriod(undefined)).toBe("all");
    expect(parsePeriod("30d")).toBe("30d");
    expect(parsePeriod("foo")).toBeNull();
    expect(parsePeriod(["30d", "90d"])).toBeNull();
  });

  it("periodFrom: 오늘을 포함해 30일·90일", () => {
    expect(periodFrom("all", "2026-11-09")).toBeNull();
    expect(periodFrom("30d", "2026-11-09")).toBe("2026-10-11");
    expect(periodFrom("90d", "2026-11-09")).toBe("2026-08-12");
  });
});

it("formatRate", () => {
  expect(formatRate(1 / 3)).toBe("33%");
  expect(formatRate(null)).toBe("–");
});

describe("buildSourceStats", () => {
  it("경로별로 도달한 가장 높은 단계까지 센다 (건너뛴 단계 포함)", () => {
    const rows = buildSourceStats(
      [
        { id: 1, status: "rejected", source: "원티드" },
        { id: 2, status: "offer", source: "원티드" },
        { id: 3, status: "applied", source: "지인 추천" },
      ],
      [
        { applicationId: 1, toStatus: "interview" },
        { applicationId: 1, toStatus: "rejected" },
      ],
    );
    expect(rows).toEqual([
      { source: "원티드", total: 2, documentPassed: 2, interview: 2, offer: 1 },
      { source: "지인 추천", total: 1, documentPassed: 0, interview: 0, offer: 0 },
    ]);
  });

  it("공백·대소문자만 맞춰 묶고, 이름은 처음 나온 표기를 쓴다", () => {
    const rows = buildSourceStats(
      [
        { id: 1, status: "applied", source: " Wanted " },
        { id: 2, status: "applied", source: "wanted" },
        { id: 3, status: "applied", source: "지인  추천" },
        { id: 4, status: "applied", source: "지인 추천" },
        { id: 5, status: "applied", source: "원티드" },
      ],
      [],
    );
    // 같은 건수면 한국어 정렬 (한글이 영문보다 앞)
    expect(rows.map((r) => [r.source, r.total])).toEqual([
      ["지인 추천", 2],
      ["Wanted", 2],
      ["원티드", 1],
    ]);
  });

  it("비어 있는 경로는 미입력(null)으로 묶어 맨 뒤에 둔다", () => {
    const rows = buildSourceStats(
      [
        { id: 1, status: "applied", source: null },
        { id: 2, status: "applied", source: "  " },
        { id: 3, status: "applied" },
        { id: 4, status: "applied", source: "사람인" },
      ],
      [],
    );
    expect(rows.map((r) => [r.source, r.total])).toEqual([
      ["사람인", 1],
      [null, 3],
    ]);
  });

  it("지원 많은 순, 같으면 이름순", () => {
    const rows = buildSourceStats(
      [
        { id: 1, status: "applied", source: "잡코리아" },
        { id: 2, status: "applied", source: "사람인" },
        { id: 3, status: "applied", source: "회사 홈페이지" },
        { id: 4, status: "applied", source: "회사 홈페이지" },
      ],
      [],
    );
    expect(rows.map((r) => r.source)).toEqual(["회사 홈페이지", "사람인", "잡코리아"]);
  });

  it("지원 건이 없으면 빈 목록", () => {
    expect(buildSourceStats([], [])).toEqual([]);
  });
});
