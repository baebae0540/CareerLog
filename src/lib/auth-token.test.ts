import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { passwordMatches, SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./auth-token";

const SECRET = "test-secret-test-secret-test-secret-1234";
const OWNER = { accountId: 1, isDemo: false };

describe("세션 토큰", () => {
  it("발급한 토큰은 계정 id와 종류를 돌려준다", async () => {
    expect(await verifySessionToken(await signSessionToken(SECRET, OWNER), SECRET)).toEqual(OWNER);
    const demo = { accountId: 42, isDemo: true };
    expect(await verifySessionToken(await signSessionToken(SECRET, demo), SECRET)).toEqual(demo);
  });

  it("다른 비밀 키로 서명한 토큰은 거부한다", async () => {
    const token = await signSessionToken("other-secret-other-secret-other-secret-12", OWNER);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it("owner 토큰은 30일 뒤 만료된다", async () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const token = await signSessionToken(SECRET, OWNER, { now: issued });
    const before = new Date(issued.getTime() + (SESSION_TTL_SECONDS - 1) * 1000);
    const after = new Date(issued.getTime() + (SESSION_TTL_SECONDS + 1) * 1000);
    expect(await verifySessionToken(token, SECRET, before)).toEqual(OWNER);
    expect(await verifySessionToken(token, SECRET, after)).toBeNull();
  });

  it("expiresAt을 주면 그 시각에 만료된다 (체험 계정)", async () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiresAt = new Date("2026-01-02T00:00:00Z");
    const token = await signSessionToken(SECRET, { accountId: 7, isDemo: true }, { now, expiresAt });
    expect(await verifySessionToken(token, SECRET, new Date("2026-01-01T23:59:00Z"))).not.toBeNull();
    expect(await verifySessionToken(token, SECRET, new Date("2026-01-02T00:01:00Z"))).toBeNull();
  });

  it("옛 형식(sub: owner)이나 이상한 sub는 거부한다", async () => {
    for (const sub of ["owner", "0", "-1", "1.5", "01", ""]) {
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(sub)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));
      expect(await verifySessionToken(token, SECRET)).toBeNull();
    }
  });

  it("토큰이나 비밀 키가 없으면 거부한다", async () => {
    const token = await signSessionToken(SECRET, OWNER);
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken(token, undefined)).toBeNull();
    expect(await verifySessionToken("not-a-jwt", SECRET)).toBeNull();
  });
});

describe("비밀번호 비교", () => {
  it("같으면 true, 다르면 false", () => {
    expect(passwordMatches("correct horse battery", "correct horse battery")).toBe(true);
    expect(passwordMatches("wrong", "correct horse battery")).toBe(false);
    expect(passwordMatches("", "correct horse battery")).toBe(false);
  });
});
