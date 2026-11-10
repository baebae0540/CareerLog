"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { passwordMatches } from "@/lib/auth-token";
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
