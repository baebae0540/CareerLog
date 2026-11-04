// 세션 토큰·비밀번호 비교 순수 로직. next/headers에 의존하지 않아 proxy와 테스트에서 함께 쓴다.
import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "careerlog_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30일 (내 기기에서만 쓰므로 길게)

const SUBJECT = "owner"; // 사용자는 1명

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(secret: string, now = new Date()): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

/** 유효하면 true. 서명 불일치·만료·형식 오류는 모두 false. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now = new Date(),
): Promise<boolean> {
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      subject: SUBJECT,
      currentDate: now,
    });
    return payload.sub === SUBJECT;
  } catch {
    return false;
  }
}

/** 길이가 달라도 시간이 일정하도록 해시한 뒤 비교한다. */
export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
