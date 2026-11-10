import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { requireLogin } from "@/lib/session";
import { logout } from "./actions";

// 로그인한 화면 공통 틀. 페이지마다 requireLogin()을 따로 호출하지만 여기서도 한 번 막는다.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireLogin();

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
