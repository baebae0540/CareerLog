import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
  type Session,
} from "@/lib/auth-token";

export type { Session };

/** 세션 쿠키 발급. expiresAt(체험 계정)이 있으면 토큰·쿠키 모두 그 시각에 끝난다. */
export async function createSession(session: Session, expiresAt?: Date) {
  const token = await signSessionToken(serverEnv().SESSION_SECRET, session, { expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JS에서 읽을 수 없게 (XSS로 탈취 방지)
    secure: process.env.NODE_ENV === "production", // 로컬 http에서도 동작하도록
    sameSite: "lax",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : { maxAge: SESSION_TTL_SECONDS }),
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** 로그인했으면 세션, 아니면 null */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, serverEnv().SESSION_SECRET);
}

/**
 * 모든 페이지·서버 액션의 첫 줄에서 호출한다. 돌려준 accountId로 모든 조회·변경 범위를 좁힌다.
 * proxy는 낙관적 검사일 뿐이라 여기서 다시 확인한다 (AGENTS.md 규칙).
 */
export async function requireLogin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
