import { eq } from "drizzle-orm";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { formatDateTime } from "@/lib/dates";
import { requireLogin } from "@/lib/session";
import { logout } from "./actions";

// 로그인한 화면 공통 틀. 페이지마다 requireLogin()을 따로 호출하지만 여기서도 한 번 막는다.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { accountId, isDemo } = await requireLogin();
  const demoExpiresAt = isDemo
    ? (await getDb().select({ at: accounts.expiresAt }).from(accounts).where(eq(accounts.id, accountId)))[0]?.at
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="text-lg font-bold">
              CareerLog
            </Link>
            <NavLinks />
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              로그아웃
            </button>
          </form>
        </div>
      </header>
      {isDemo && (
        <div data-demo-banner className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="mx-auto w-full max-w-5xl px-4 py-2 text-xs sm:text-sm">
            체험 계정입니다. 예시 데이터를 자유롭게 바꿔 보세요.
            {demoExpiresAt && <> 데이터는 {formatDateTime(demoExpiresAt)}에 삭제됩니다.</>}
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
