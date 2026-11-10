import Link from "next/link";
import { redirect } from "next/navigation";
import { getWeekData } from "@/db/queries";
import { MonthCalendar } from "@/components/month-calendar";
import { secondaryButtonClass } from "@/components/ui";
import { Summary } from "@/components/week-calendar";
import { todayInSeoul } from "@/lib/dates";
import { addMonths, formatMonth, monthOf, monthWeeks, parseMonth, summarizeMonth } from "@/lib/month";
import { requireLogin } from "@/lib/session";
import { buildWeek } from "@/lib/week";

// 한 달 달력. 재료는 주간 화면과 같은 getWeekData(달력 첫 일요일부터 4~6주)이고, 주마다 buildWeek로 날짜별로 묶는다.
export default async function MonthPage(props: PageProps<"/month">) {
  await requireLogin();
  const today = todayInSeoul();
  const thisMonth = monthOf(today);
  const ym = parseMonth((await props.searchParams).m, thisMonth);
  if (ym === null) redirect("/month");

  const starts = monthWeeks(ym);
  const data = await getWeekData(starts[0], starts.length * 7);
  const weeks = starts.map((start) => ({ start, days: buildWeek(start, data).days }));
  const summary = summarizeMonth(ym, weeks.flatMap((w) => w.days));
  const monthHref = (m: string) => (m === thisMonth ? "/month" : `/month?m=${m}`);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">월간</h1>
          <p className="text-sm text-zinc-500">
            {ym === thisMonth ? `이번 달 · ${formatMonth(ym)}` : formatMonth(ym)}
          </p>
        </div>
        <nav aria-label="달 이동" className="flex gap-2">
          <Link href={monthHref(addMonths(ym, -1))} className={secondaryButtonClass}>
            ‹ 이전 달
          </Link>
          <Link
            href="/month"
            aria-disabled={ym === thisMonth}
            className={`${secondaryButtonClass} ${ym === thisMonth ? "pointer-events-none opacity-50" : ""}`}
          >
            이번 달
          </Link>
          <Link href={monthHref(addMonths(ym, 1))} className={secondaryButtonClass}>
            다음 달 ›
          </Link>
        </nav>
      </div>

      <Summary summary={summary} />

      <MonthCalendar ym={ym} today={today} weeks={weeks} />

      <p className="text-xs text-zinc-500">
        요약 숫자는 이 달 날짜만 셉니다. 날짜나 &quot;+N개 더&quot;를 누르면 그 주의 주간 화면으로 가고, 날짜 이동(드래그)은
        주간 화면에서 합니다.
      </p>
    </section>
  );
}
