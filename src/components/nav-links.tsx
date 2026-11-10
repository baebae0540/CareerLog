"use client";

// 헤더 메뉴. 지금 보고 있는 화면은 글자를 진하게 하고 아래에 막대를 그린다 (탭 모양).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNav, NAV_ITEMS } from "@/lib/nav";

export function NavLinks() {
  const active = activeNav(usePathname());

  return (
    <nav className="-mb-px flex h-14 gap-4 self-end text-sm">
      {NAV_ITEMS.map((item) => {
        const current = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`flex items-center border-b-2 whitespace-nowrap transition-colors ${
              current
                ? "border-zinc-900 font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
