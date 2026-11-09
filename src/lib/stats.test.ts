import { describe, expect, it } from "vitest";
import { buildFunnel, formatRate, parsePeriod, periodFrom } from "./stats";

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
