// 세션 토큰·비밀번호 비교 순수 로직. next/headers에 의존하지 않아 proxy와 테스트에서 함께 쓴다.
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "careerlog_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // owner: 30일 (내 기기에서만 쓰므로 길게)

/** 로그인한 계정. 모든 조회·변경은 accountId로 범위를 좁힌다. */
export type Session = { accountId: number; isDemo: boolean };

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

/**
 * sub = 계정 id, demo 클레임 = 체험 계정 여부.
 * expiresAt을 주면(체험 계정) 그 시각에 만료, 아니면 발급 후 SESSION_TTL_SECONDS.
 */
export async function signSessionToken(
  secret: string,
  session: Session,
  { now = new Date(), expiresAt }: { now?: Date; expiresAt?: Date } = {},
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : iat + SESSION_TTL_SECONDS;
  return new SignJWT({ demo: session.isDemo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.accountId))
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key(secret));
}

/** 유효하면 세션, 서명 불일치·만료·형식 오류·옛 형식(sub: "owner")은 모두 null. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now = new Date(),
): Promise<Session | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"], currentDate: now });
    const accountId = Number(payload.sub);
    if (!/^[1-9]\d*$/.test(payload.sub ?? "") || !Number.isSafeInteger(accountId)) return null;
    return { accountId, isDemo: payload.demo === true };
  } catch {
    return null;
  }
}

/** 길이가 달라도 시간이 일정하도록 해시한 뒤 비교한다. */
export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
