"use client";

import { useActionState } from "react";
import { login, startDemo, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [demoState, demoAction, demoPending] = useActionState<LoginState>(startDemo, {});

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-3">
        <label htmlFor="password" className="text-sm font-medium">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "확인 중…" : "로그인"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        처음 오셨나요?
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={demoAction} className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={demoPending}
          data-demo
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {demoPending ? "예시 데이터 준비 중…" : "체험하기"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          예시 데이터가 든 나만의 체험 공간이 만들어집니다. 자유롭게 고쳐 보세요. 24시간 뒤 자동으로 삭제됩니다.
        </p>
        {demoState.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {demoState.error}
          </p>
        )}
      </form>
    </div>
  );
}
