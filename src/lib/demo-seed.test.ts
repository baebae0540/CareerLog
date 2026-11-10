import { describe, expect, it } from "vitest";
import { applicationStatus } from "@/db/schema";
import { addDays, seoulParts, weekStart } from "./dates";
import { buildDemoSeed } from "./demo-seed";
import { buildFunnel, buildSourceStats } from "./stats";

const TODAY = "2026-11-11";
const seed = buildDemoSeed(TODAY);

describe("체험 계정 예시 데이터", () => {
  it("모든 상태가 한 번 이상 나온다", () => {
    const statuses = new Set(seed.applications.map((a) => a.status));
    expect([...statuses].sort()).toEqual([...applicationStatus.enumValues].sort());
  });

  it("지원 건마다 이력이 이어지고 마지막 이력 = 지금 상태", () => {
    for (const app of seed.applications) {
      const hist = seed.changes.filter((c) => c.key === app.key);
      expect(hist[0].fromStatus).toBeNull();
      hist.slice(1).forEach((c, i) => expect(c.fromStatus).toBe(hist[i].toStatus));
      expect(hist.at(-1)!.toStatus).toBe(app.status);
      // 변경일·기록 시각이 시간 순서
      const on = hist.map((c) => c.changedOn);
      expect(on).toEqual([...on].sort());
      const at = hist.map((c) => c.changedAt);
      expect(at).toEqual([...at].sort());
    }
  });

  it("지원일: 관심이면 비고, 아니면 첫 이력 날짜이며 최근 12주 안", () => {
    const from = addDays(weekStart(TODAY), -77); // 통계 주별 추이의 첫 주 일요일
    for (const app of seed.applications) {
      const first = seed.changes.find((c) => c.key === app.key)!;
      if (app.status === "interested") {
        expect(app.appliedAt).toBeNull();
      } else {
        expect(app.appliedAt).toBe(first.changedOn);
        expect(app.appliedAt! >= from && app.appliedAt! <= TODAY).toBe(true);
      }
    }
  });

  it("상태 변경은 오늘 이후로 넘어가지 않는다", () => {
    expect(seed.changes.every((c) => c.changedOn <= TODAY)).toBe(true);
  });

  it("일정이 지난주·이번 주·다음 주에 모두 있고, 시간 미정·완료 일정도 있다", () => {
    const thisWeek = weekStart(TODAY);
    const ymds = seed.events.map((e) => seoulParts(new Date(e.startsAt)).ymd);
    const inWeek = (start: string) => ymds.some((d) => d >= start && d <= addDays(start, 6));
    expect(inWeek(addDays(thisWeek, -7))).toBe(true);
    expect(inWeek(thisWeek)).toBe(true);
    expect(inWeek(addDays(thisWeek, 7))).toBe(true);
    expect(seed.events.some((e) => e.allDay)).toBe(true);
    expect(seed.events.some((e) => e.done)).toBe(true);
    // 시간 미정은 그날 00:00 한국 시간
    for (const e of seed.events.filter((e) => e.allDay)) expect(seoulParts(new Date(e.startsAt)).time).toBe("00:00");
  });

  it("일정과 이력은 모두 있는 지원 건을 가리킨다", () => {
    const keys = new Set(seed.applications.map((a) => a.key));
    expect(seed.changes.every((c) => keys.has(c.key))).toBe(true);
    expect(seed.events.every((e) => keys.has(e.key))).toBe(true);
  });

  it("통계 퍼널의 모든 단계가 채워지고 지원 경로가 여러 개다", () => {
    const ids = new Map(seed.applications.map((a, i) => [a.key, i + 1]));
    const apps = seed.applications
      .filter((a) => a.status !== "interested")
      .map((a) => ({ id: ids.get(a.key)!, status: a.status, source: a.source }));
    const changes = seed.changes.map((c) => ({ applicationId: ids.get(c.key)!, toStatus: c.toStatus }));
    const funnel = buildFunnel(apps, changes);
    expect(funnel.stages.every((r) => r.count > 0)).toBe(true);
    expect(buildSourceStats(apps, changes).length).toBeGreaterThanOrEqual(4);
  });

  it("오늘이 바뀌면 날짜도 따라 움직인다", () => {
    const later = buildDemoSeed(addDays(TODAY, 30));
    expect(later.applications[0].appliedAt).toBe(addDays(seed.applications[0].appliedAt!, 30));
  });
});
