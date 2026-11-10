// 월간 달력 (서버 컴포넌트, 드래그 없음 — 날짜 이동은 주간 화면에서).
// 넓은 화면(md 이상)은 일~토 7칸 달력, 좁은 화면은 항목이 있는 날만 세로 목록으로 보여준다.
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { weekdayName } from "@/lib/dates";
import { EVENT_KIND_BADGE_CLASS, EVENT_KIND_LABEL } from "@/lib/labels";
import { monthOf } from "@/lib/month";
import type { WeekDay, WeekItem } from "@/lib/week";

/** 달력 칸 하나에 보여줄 최대 항목 수 (넘으면 "+N개"로 그 주의 주간 화면에 연결) */
const CELL_LIMIT = 3;
const WEEKDAY_HEADS = ["일", "월", "화", "수", "목", "금", "토"];

export type MonthWeek = { start: string; days: WeekDay[] };

function dayTone(ymd: string): string {
  const w = weekdayName(ymd);
  return w === "일" ? "text-red-500" : w === "토" ? "text-blue-500" : "text-zinc-600 dark:text-zinc-300";
}

export function MonthCalendar({ ym, today, weeks }: { ym: string; today: string; weeks: MonthWeek[] }) {
  const listDays = weeks.flatMap((w) => w.days).filter((d) => monthOf(d.ymd) === ym && d.items.length > 0);

  return (
    <>
      {/* 넓은 화면: 달력 */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 md:block dark:border-zinc-800" data-month-grid>
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
          {WEEKDAY_HEADS.map((w, i) => (
            <span key={w} className={`py-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-500"}`}>
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <ol key={week.start} className="grid grid-cols-7 divide-x divide-zinc-200 border-b border-zinc-200 last:border-b-0 dark:divide-zinc-800 dark:border-zinc-800">
            {week.days.map((day) => (
              <MonthCell key={day.ymd} day={day} weekStart={week.start} inMonth={monthOf(day.ymd) === ym} isToday={day.ymd === today} />
            ))}
          </ol>
        ))}
      </div>

      {/* 좁은 화면: 항목 있는 날만 */}
      <div className="md:hidden" data-month-list>
        {listDays.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            이 달에는 기록이 없습니다.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {listDays.map((day) => {
              const [, m, d] = day.ymd.split("-").map(Number);
              const isToday = day.ymd === today;
              return (
                <li
                  key={day.ymd}
                  data-ymd={day.ymd}
                  className={`flex flex-col gap-1.5 rounded-xl border bg-white p-3 dark:bg-zinc-950 ${
                    isToday ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400" : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <p className={`text-sm font-semibold ${isToday ? "text-blue-600 dark:text-blue-400" : dayTone(day.ymd)}`}>
                    {m}/{d} ({weekdayName(day.ymd)}){isToday && <span className="ml-1 text-xs">오늘</span>}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {day.items.map((item) => (
                      <li key={item.key}>
                        <ItemLine item={item} />
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function MonthCell({ day, weekStart, inMonth, isToday }: { day: WeekDay; weekStart: string; inMonth: boolean; isToday: boolean }) {
  const [, m, d] = day.ymd.split("-").map(Number);
  const shown = day.items.slice(0, CELL_LIMIT);
  const more = day.items.length - shown.length;
  const weekHref = `/week?start=${weekStart}`;

  return (
    <li
      data-ymd={day.ymd}
      data-count={day.items.length}
      aria-current={isToday ? "date" : undefined}
      className={`flex min-h-28 min-w-0 flex-col gap-1 p-1.5 ${
        inMonth ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900/60"
      } ${isToday ? "ring-2 ring-blue-500 ring-inset dark:ring-blue-400" : ""}`}
    >
      <Link
        href={weekHref}
        title="이 주의 주간 화면으로"
        className={`self-start rounded px-1 text-xs font-semibold tabular-nums hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          isToday ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500" : inMonth ? dayTone(day.ymd) : "text-zinc-400 dark:text-zinc-600"
        }`}
      >
        {d === 1 ? `${m}/${d}` : d}
      </Link>
      {shown.length > 0 && (
        <ul className={`flex flex-col gap-0.5 ${inMonth ? "" : "opacity-60"}`}>
          {shown.map((item) => (
            <li key={item.key}>
              <ItemLine item={item} compact />
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <Link href={weekHref} data-more className="mt-auto px-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          +{more}개 더
        </Link>
      )}
    </li>
  );
}

/** 항목 한 줄. compact(달력 칸)이면 한 줄로 자르고, 아니면 줄바꿈 허용 */
function ItemLine({ item, compact = false }: { item: WeekItem; compact?: boolean }) {
  const text = compact ? "truncate" : "";
  const base = `flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800`;
  const href = `/applications/${item.applicationId}`;
  const tag = "shrink-0 rounded px-1 text-[11px] font-medium";

  if (item.type === "event") {
    return (
      <Link href={href} data-item={item.key} title={`${item.company} · ${item.title}`} className={`${base} ${item.done ? "opacity-50" : ""}`}>
        <span className={`${tag} ${EVENT_KIND_BADGE_CLASS[item.kind]}`}>{EVENT_KIND_LABEL[item.kind]}</span>
        {item.time && <span className="shrink-0 text-zinc-500 tabular-nums">{item.time}</span>}
        <span className={`min-w-0 font-medium ${text} ${item.done ? "line-through" : ""}`}>{item.company}</span>
        {!compact && <span className="min-w-0 text-zinc-500">{item.title}</span>}
      </Link>
    );
  }
  if (item.type === "status") {
    return (
      <Link href={href} data-item={item.key} title={`${item.company}: 상태 변경`} className={base}>
        <span className={`min-w-0 font-medium ${text}`}>{item.company}</span>
        <span className="shrink-0 text-zinc-400">→</span>
        <span className="shrink-0 [&>span]:px-1.5 [&>span]:text-[11px]">
          <StatusBadge status={item.to} />
        </span>
      </Link>
    );
  }
  return (
    <Link href={href} data-item={item.key} title={`${item.company} · ${item.position}`} className={base}>
      <span className={`${tag} bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}>지원</span>
      <span className={`min-w-0 font-medium ${text}`}>{item.company}</span>
      {!compact && <span className="min-w-0 text-zinc-500">{item.position}</span>}
    </Link>
  );
}
