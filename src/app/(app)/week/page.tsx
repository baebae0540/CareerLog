import Link from "next/link";
import { redirect } from "next/navigation";
import { getWeekData } from "@/db/queries";
import { secondaryButtonClass } from "@/components/ui";
import { WeekCalendar } from "@/components/week-calendar";
import { addDays, daysBetween, formatWeekRange, isValidYmd, todayInSeoul, weekStart } from "@/lib/dates";
import { requireLogin } from "@/lib/session";

/** 오늘이 속한 주를 기준으로 한 이름: 지난 주 / 이번 주 / 다음 주 / N주 전·후 */
function weekLabel(start: string, thisWeek: string): string {
  const n = daysBetween(thisWeek, start) / 7;
  if (n === 0) return "이번 주";
  if (n === -1) return "지난 주";
  if (n === 1) return "다음 주";
  return n < 0 ? `${-n}주 전` : `${n}주 후`;
}

// 기준 주(기본은 이번 주)와 앞뒤 한 주씩, 3주를 한 화면에 보여준다.
export default async function WeekPage(props: PageProps<"/week">) {
  await requireLogin();
  const today = todayInSeoul();
  const thisWeek = weekStart(today);

  // ?start= 가 없으면 이번 주. 잘못된 값이면 이번 주로, 일요일이 아니면 그 주의 일요일로 주소를 맞춘다.
  const raw = (await props.searchParams).start;
  const requested = typeof raw === "string" ? raw : undefined;
  let start = thisWeek;
  if (requested !== undefined) {
    if (!isValidYmd(requested)) redirect("/week");
    start = weekStart(requested);
    if (start !== requested) redirect(`/week?start=${start}`);
  }

  const first = addDays(start, -7);
  const weeks = [first, start, addDays(start, 7)].map((s) => ({ start: s, label: weekLabel(s, thisWeek) }));
  const data = await getWeekData(first, 21);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">주간</h1>
          <p className="text-sm text-zinc-500">
            {weekLabel(start, thisWeek)} · {formatWeekRange(start)}
          </p>
        </div>
        <nav aria-label="주 이동" className="flex gap-2">
          <Link href={`/week?start=${addDays(start, -7)}`} className={secondaryButtonClass}>
            ‹ 이전 주
          </Link>
          <Link
            href="/week"
            aria-disabled={start === thisWeek}
            className={`${secondaryButtonClass} ${start === thisWeek ? "pointer-events-none opacity-50" : ""}`}
          >
            이번 주
          </Link>
          <Link href={`/week?start=${addDays(start, 7)}`} className={secondaryButtonClass}>
            다음 주 ›
          </Link>
        </nav>
      </div>

      <p className="text-xs text-zinc-500">항목을 다른 날짜로 끌어다 놓으면 날짜가 바뀝니다. 폰에서는 길게 눌러서 끕니다.</p>

      <WeekCalendar weeks={weeks} focusStart={start} today={today} data={data} />
    </section>
  );
}
