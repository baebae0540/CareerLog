"use server";

import { redirect } from "next/navigation";
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

  await createSession();
  redirect("/");
}
