"use server";

import { and, count, eq, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { insertDemoAccount } from "@/db/statements";
import { passwordMatches } from "@/lib/auth-token";
import { todayInSeoul } from "@/lib/dates";
import { buildDemoSeed, DEMO_TTL_HOURS, MAX_DEMO_ACCOUNTS } from "@/lib/demo-seed";
import { serverEnv } from "@/lib/env";
import { createSession } from "@/lib/session";

export type LoginState = { error?: string };

const FAILURE_DELAY_MS = 1000; // 실패 시 지연: 무차별 대입 속도를 늦춘다

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "비밀번호를 입력하세요." };
  }

  if (!passwordMatches(password, serverEnv().APP_PASSWORD)) {
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
    return { error: "비밀번호가 맞지 않습니다." };
  }

  // owner 계정은 마이그레이션 0004가 하나 만들어 둔다 (accounts_one_owner_idx로 하나뿐)
  const [owner] = await getDb().select({ id: accounts.id }).from(accounts).where(eq(accounts.kind, "owner"));
  if (!owner) return { error: "owner 계정이 없습니다. pnpm db:migrate를 확인하세요." };

  await createSession({ accountId: owner.id, isDemo: false });
  redirect("/");
}

/**
 * '체험하기': 방문자마다 예시 데이터가 든 새 체험 계정을 만들고 DEMO_TTL_HOURS 동안 로그인시킨다.
 * 만료된 체험 계정은 여기서 함께 지운다 (Cron 없이, 지원 건·이력·일정·사진은 cascade).
 */
export async function startDemo(): Promise<LoginState> {
  const db = getDb();
  const now = new Date();
  await db.delete(accounts).where(and(eq(accounts.kind, "demo"), lte(accounts.expiresAt, now)));

  const [{ active }] = await db.select({ active: count() }).from(accounts).where(eq(accounts.kind, "demo"));
  if (active >= MAX_DEMO_ACCOUNTS) {
    return { error: "지금 체험하는 사람이 많습니다. 잠시 후 다시 시도해 주세요." };
  }

  const expiresAt = new Date(now.getTime() + DEMO_TTL_HOURS * 3600_000);
  const result = await db.execute(insertDemoAccount(buildDemoSeed(todayInSeoul(now)), expiresAt));
  await createSession({ accountId: Number(result.rows[0].id), isDemo: true }, expiresAt);
  redirect("/");
}
