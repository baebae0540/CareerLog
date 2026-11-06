import Link from "next/link";
import { countByStatus, listApplications } from "@/db/queries";
import { applicationStatus, type ApplicationStatus } from "@/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { cardClass, primaryButtonClass } from "@/components/ui";
import { isBeforeApplying } from "@/lib/application-input";
import { formatYmd } from "@/lib/dates";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { requireLogin } from "@/lib/session";

function parseStatus(value: string | string[] | undefined): ApplicationStatus | undefined {
  return typeof value === "string" && (applicationStatus.enumValues as string[]).includes(value)
    ? (value as ApplicationStatus)
    : undefined;
}

export default async function ApplicationListPage(props: PageProps<"/">) {
  await requireLogin();
  const status = parseStatus((await props.searchParams).status);
  const [items, counts] = await Promise.all([listApplications(status), countByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">지원 목록</h1>
        <Link href="/applications/new" className={primaryButtonClass}>
          + 새 지원
        </Link>
      </div>

      {/* 상태 필터: 건수가 있는 상태만 보여준다 */}
      <nav aria-label="상태 필터" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterLink href="/" active={!status} label="전체" count={total} />
        {STATUS_ORDER.filter((s) => counts[s] || s === status).map((s) => (
          <FilterLink key={s} href={`/?status=${s}`} active={status === s} label={STATUS_LABEL[s]} count={counts[s] ?? 0} />
        ))}
      </nav>

      {items.length === 0 ? (
        <div className={`${cardClass} px-6 py-16 text-center text-zinc-500`}>
          {status ? (
            <p>{STATUS_LABEL[status]} 상태인 지원이 없습니다.</p>
          ) : (
            <>
              <p className="mb-4">아직 등록한 지원이 없습니다.</p>
              <Link href="/applications/new" className={primaryButtonClass}>
                첫 지원 등록하기
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className={`${cardClass} divide-y divide-zinc-200 dark:divide-zinc-800`}>
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/applications/${a.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.company}</p>
                  <p className="truncate text-sm text-zinc-500">
                    {a.position}
                    {a.source && <span className="text-zinc-400"> · {a.source}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-zinc-400">
                    {a.appliedAt && !isBeforeApplying(a.status) ? `${formatYmd(a.appliedAt)} 지원` : "지원 전"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {label} <span className="opacity-60">{count}</span>
    </Link>
  );
}
