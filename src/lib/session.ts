import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth-token";

export async function createSession() {
  const token = await signSessionToken(serverEnv().SESSION_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JS에서 읽을 수 없게 (XSS로 탈취 방지)
    secure: process.env.NODE_ENV === "production", // 로컬 http에서도 동작하도록
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, serverEnv().SESSION_SECRET);
}

/**
 * 모든 페이지·서버 액션의 첫 줄에서 호출한다.
 * proxy는 낙관적 검사일 뿐이라 여기서 다시 확인한다 (AGENTS.md 규칙).
 */
export async function requireLogin() {
  if (!(await isLoggedIn())) redirect("/login");
}
