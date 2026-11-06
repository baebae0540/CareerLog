import { describe, expect, it } from "vitest";
import { parseCreateForm, parseId, parseStatusChangeForm, parseUpdateForm } from "./application-input";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const valid = {
  company: "  토스  ",
  position: "백엔드 개발자",
  jobUrl: "https://toss.im/career/job/123",
  source: "원티드",
  appliedAt: "2026-11-06",
  memo: "추천인: 김OO",
  status: "applied",
};

describe("parseCreateForm", () => {
  it("올바른 입력은 앞뒤 공백을 지우고 통과한다", () => {
    const r = parseCreateForm(form(valid));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.company).toBe("토스");
      expect(r.data.status).toBe("applied");
    }
  });

  it("선택 항목이 비어 있으면 null이 된다", () => {
    const r = parseCreateForm(form({ company: "A", position: "B", status: "interested" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ jobUrl: null, source: null, appliedAt: null, memo: null });
    }
  });

  it("필수 항목이 비면 필드별 오류와 입력값을 돌려준다", () => {
    const r = parseCreateForm(form({ ...valid, company: "   ", position: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.state.errors?.company).toBeDefined();
      expect(r.state.errors?.position).toBeDefined();
      expect(r.state.values?.memo).toBe(valid.memo); // 다시 채우기용
    }
  });

  it("http(s)가 아닌 링크는 거부한다", () => {
    for (const jobUrl of ["javascript:alert(1)", "toss.im", "ftp://x.com"]) {
      const r = parseCreateForm(form({ ...valid, jobUrl }));
      expect(r.ok, jobUrl).toBe(false);
    }
  });

  it("없는 날짜와 잘못된 상태는 거부한다", () => {
    expect(parseCreateForm(form({ ...valid, appliedAt: "2026-02-30" })).ok).toBe(false);
    expect(parseCreateForm(form({ ...valid, status: "hacked" })).ok).toBe(false);
  });
});

describe("관심 = 지원 전", () => {
  it("관심 상태로 등록하면 지원일이 있어도 비운다", () => {
    const r = parseCreateForm(form({ ...valid, status: "interested", appliedAt: "2026-11-06" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.appliedAt).toBeNull();
  });
  it("다른 상태는 지원일을 유지한다", () => {
    const r = parseCreateForm(form({ ...valid, status: "interview" }));
    expect(r.ok && r.data.appliedAt).toBe("2026-11-06");
  });
});

describe("parseStatusChangeForm", () => {
  it("올바른 입력", () => {
    const r = parseStatusChangeForm(form({ toStatus: "interview", changedOn: "2026-11-06", note: " 1차 " }));
    expect(r).toEqual({ ok: true, data: { toStatus: "interview", changedOn: "2026-11-06", note: "1차" } });
  });
  it("메모는 비우면 null", () => {
    const r = parseStatusChangeForm(form({ toStatus: "offer", changedOn: "2026-11-06" }));
    expect(r.ok && r.data.note).toBeNull();
  });
  it("변경일은 필수이고 실제 날짜여야 한다", () => {
    expect(parseStatusChangeForm(form({ toStatus: "offer", changedOn: "" })).ok).toBe(false);
    expect(parseStatusChangeForm(form({ toStatus: "offer", changedOn: "2026-02-30" })).ok).toBe(false);
  });
  it("없는 상태는 거부", () => {
    const r = parseStatusChangeForm(form({ toStatus: "hired", changedOn: "2026-11-06" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.state.errors?.toStatus).toBeDefined();
  });
});

describe("parseUpdateForm", () => {
  it("상태 값은 무시한다 (상태는 changeStatus로만 변경)", () => {
    const r = parseUpdateForm(form({ ...valid, status: "offer" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect("status" in r.data).toBe(false);
  });
});

describe("parseId", () => {
  it("양의 정수만 통과", () => {
    expect(parseId("12")).toBe(12);
    expect(parseId("0")).toBeNull();
    expect(parseId("-1")).toBeNull();
    expect(parseId("1.5")).toBeNull();
    expect(parseId("abc")).toBeNull();
    expect(parseId("9999999999")).toBeNull();
  });
});
