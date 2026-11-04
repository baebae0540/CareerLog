import { describe, expect, it } from "vitest";
import {
  passwordMatches,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./auth-token";

const SECRET = "test-secret-test-secret-test-secret-1234";

describe("세션 토큰", () => {
  it("발급한 토큰은 검증을 통과한다", async () => {
    const token = await signSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("다른 비밀 키로 서명한 토큰은 거부한다", async () => {
    const token = await signSessionToken("other-secret-other-secret-other-secret-12");
    expect(await verifySessionToken(token, SECRET)).toBe(false);
  });

  it("만료된 토큰은 거부한다", async () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const token = await signSessionToken(SECRET, issued);
    const afterExpiry = new Date(issued.getTime() + (SESSION_TTL_SECONDS + 1) * 1000);
    expect(await verifySessionToken(token, SECRET, afterExpiry)).toBe(false);
  });

  it("토큰이나 비밀 키가 없으면 거부한다", async () => {
    const token = await signSessionToken(SECRET);
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken(token, undefined)).toBe(false);
    expect(await verifySessionToken("not-a-jwt", SECRET)).toBe(false);
  });
});

describe("비밀번호 비교", () => {
  it("같으면 true, 다르면 false", () => {
    expect(passwordMatches("correct horse battery", "correct horse battery")).toBe(true);
    expect(passwordMatches("wrong", "correct horse battery")).toBe(false);
    expect(passwordMatches("", "correct horse battery")).toBe(false);
  });
});
