"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { deleteSession, getSession } from "@/lib/session";

/** 로그아웃. 체험 계정이면 그 계정의 데이터를 바로 지운다 (다시 들어올 방법이 없으므로). */
export async function logout() {
  const session = await getSession();
  if (session?.isDemo) {
    await getDb()
      .delete(accounts)
      .where(and(eq(accounts.id, session.accountId), eq(accounts.kind, "demo")));
  }
  await deleteSession();
  redirect("/login");
}
