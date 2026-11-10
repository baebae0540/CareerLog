import { describe, expect, it } from "vitest";
import { activeNav } from "./nav";

describe("activeNav", () => {
  it("목록·등록·상세·수정은 지원 목록", () => {
    for (const p of ["/", "/applications/new", "/applications/12", "/applications/12/edit"]) {
      expect(activeNav(p)).toBe("applications");
    }
  });

  it("주간·통계", () => {
    expect(activeNav("/week")).toBe("week");
    expect(activeNav("/stats")).toBe("stats");
  });

  it("이름이 비슷한 다른 주소는 고르지 않는다", () => {
    expect(activeNav("/weekly")).toBeNull();
    expect(activeNav("/statsx")).toBeNull();
    expect(activeNav("/login")).toBeNull();
  });
});
