import { describe, expect, it } from "vitest";
import { normalizeTime, parseEventForm } from "./event-input";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const valid = { kind: "interview", title: " 1차 면접 ", date: "2026-11-10", time: "14:00", memo: "" };

describe("normalizeTime", () => {
  it("여러 형식을 HH:MM으로", () => {
    expect(normalizeTime("14:00")).toBe("14:00");
    expect(normalizeTime("9:30")).toBe("09:30");
    expect(normalizeTime("1400")).toBe("14:00");
    expect(normalizeTime("930")).toBe("09:30");
    expect(normalizeTime(" 23:59 ")).toBe("23:59");
  });
  it("빈 값은 시간 미정(null)", () => {
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime("  ")).toBeNull();
  });
  it("알아볼 수 없거나 범위 밖이면 undefined", () => {
    expect(normalizeTime("24:00")).toBeUndefined();
    expect(normalizeTime("12:60")).toBeUndefined();
    expect(normalizeTime("오후 2시")).toBeUndefined();
    expect(normalizeTime("1:5")).toBeUndefined();
  });
});

describe("parseEventForm", () => {
  it("시간이 있으면 한국 시간 시각으로", () => {
    const r = parseEventForm(form(valid));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual({
      kind: "interview",
      title: "1차 면접",
      startsAt: new Date("2026-11-10T05:00:00Z"),
      allDay: false,
      memo: null,
    });
  });
  it("시간을 비우면 시간 미정, 그날 00:00 한국 시간", () => {
    const r = parseEventForm(form({ ...valid, time: "" }));
    expect(r.ok && r.data.allDay).toBe(true);
    expect(r.ok && r.data.startsAt.toISOString()).toBe("2026-11-09T15:00:00.000Z");
  });
  it("제목을 비우면 종류 이름", () => {
    const r = parseEventForm(form({ ...valid, kind: "deadline", title: "  " }));
    expect(r.ok && r.data.title).toBe("마감");
  });
  it("잘못된 입력은 필드별 오류와 입력값을 돌려준다", () => {
    const r = parseEventForm(form({ kind: "party", title: "", date: "2026-02-30", time: "25:00", memo: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.state.errors ?? {}).sort()).toEqual(["date", "kind", "time"]);
    expect(r.state.values?.time).toBe("25:00");
  });
});
