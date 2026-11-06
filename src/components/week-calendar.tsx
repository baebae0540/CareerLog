"use client";

// 주간 캘린더 (여러 주). 항목을 다른 날짜 칸으로 끌어다 놓으면 날짜가 바뀐다.
// 마우스는 5px 이상 움직여야, 터치는 길게(0.25초) 눌러야 드래그가 시작된다 (짧게 누르면 상세로 이동, 스크롤도 그대로).
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDndMonitor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { moveWeekItem } from "@/app/(app)/week/actions";
import { StatusBadge } from "@/components/status-badge";
import { cardClass } from "@/components/ui";
import { formatWeekRange, weekdayName } from "@/lib/dates";
import { EVENT_KIND_BADGE_CLASS, EVENT_KIND_LABEL } from "@/lib/labels";
import { buildWeek, moveItem, type WeekData, type WeekItem, type WeekMove, type WeekSummary } from "@/lib/week";

export type CalendarWeek = { start: string; label: string | null };

export function WeekCalendar({
  weeks,
  focusStart,
  today,
  data,
}: {
  weeks: CalendarWeek[];
  focusStart: string; // 요약 숫자를 보여줄 주
  today: string;
  data: WeekData;
}) {
  const [optimistic, applyMove] = useOptimistic(data, moveItem);
  const [, startTransition] = useTransition();
  const [active, setActive] = useState<WeekItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const built = weeks.map((w) => ({ ...w, ...buildWeek(w.start, optimistic) }));
  const focus = built.find((w) => w.start === focusStart);
  const itemsByKey = new Map(built.flatMap((w) => w.days.flatMap((d) => d.items)).map((i) => [i.key, i]));

  function onDragStart(e: DragStartEvent) {
    setError(null);
    setActive(itemsByKey.get(String(e.active.id)) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const item = itemsByKey.get(String(e.active.id));
    const ymd = e.over ? String(e.over.id) : null;
    if (!item || !ymd || ymd === item.ymd) return;

    const move: WeekMove = { type: item.type, id: item.id, ymd };
    startTransition(async () => {
      applyMove(move);
      const result = await moveWeekItem(item.type, item.applicationId, item.id, ymd);
      // 실패하면 트랜잭션이 끝날 때 원래 데이터로 돌아간다
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {focus && <Summary summary={focus.summary} />}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <DndContext id="week-dnd" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
        {built.map((week) => (
          <section key={week.start} aria-label={week.label ?? formatWeekRange(week.start)} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 text-sm">
              {week.label && <span className="font-semibold">{week.label}</span>}
              <span className="text-zinc-500">{formatWeekRange(week.start)}</span>
            </h2>
            <ol className="grid grid-cols-1 gap-2 lg:grid-cols-7">
              {week.days.map((day) => (
                <DayCell key={day.ymd} ymd={day.ymd} today={today} items={day.items} />
              ))}
            </ol>
          </section>
        ))}
        <DragOverlay dropAnimation={null}>
          {active && (
            <div className="w-40 rotate-2 rounded-lg bg-white shadow-lg dark:bg-zinc-900">
              <ItemCard item={active} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Summary({ summary }: { summary: WeekSummary }) {
  const cells = [
    { label: "신규 지원", value: `${summary.applied}` },
    { label: "일정 (완료/전체)", value: `${summary.eventsDone}/${summary.events}` },
    { label: "상태 변경", value: `${summary.statusChanges}` },
    { label: "합격 · 불합격", value: `${summary.offers} · ${summary.rejections}` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className={`${cardClass} px-4 py-3`}>
          <dt className="text-xs text-zinc-500">{c.label}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DayCell({ ymd, today, items }: { ymd: string; today: string; items: WeekItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: ymd });
  const isToday = ymd === today;
  const [, m, d] = ymd.split("-").map(Number);
  const weekday = weekdayName(ymd);

  return (
    <li
      ref={setNodeRef}
      data-ymd={ymd}
      aria-current={isToday ? "date" : undefined}
      className={`${cardClass} flex min-w-0 flex-col gap-2 p-3 transition-colors lg:min-h-28 ${
        isToday ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400" : ""
      } ${isOver ? "bg-blue-50 dark:bg-blue-950/40" : ""} ${items.length === 0 ? "max-lg:py-2" : ""}`}
    >
      <p
        className={`text-sm font-semibold ${
          isToday
            ? "text-blue-600 dark:text-blue-400"
            : weekday === "일"
              ? "text-red-500"
              : weekday === "토"
                ? "text-blue-500"
                : "text-zinc-600 dark:text-zinc-300"
        }`}
      >
        {m}/{d} ({weekday}){isToday && <span className="ml-1 text-xs">오늘</span>}
      </p>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <DraggableItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DraggableItem({ item }: { item: WeekItem }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: item.key });
  // 드래그가 끝난 직후(같은 자리에 놓은 경우)의 클릭은 상세 이동으로 처리하지 않는다.
  // 클릭은 mouseup 직후 같은 작업 안에서 오므로, 그 다음 틱에 표시를 지운다.
  const dragged = useRef(false);
  useDndMonitor({
    onDragStart: (e) => {
      if (e.active.id === item.key) dragged.current = true;
    },
    onDragEnd: () => setTimeout(() => (dragged.current = false), 0),
    onDragCancel: () => setTimeout(() => (dragged.current = false), 0),
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role={undefined}
      tabIndex={undefined}
      data-item={item.key}
      className={`touch-manipulation select-none [-webkit-touch-callout:none] ${isDragging ? "opacity-30" : ""}`}
      onClickCapture={(e) => {
        if (dragged.current) e.preventDefault();
      }}
    >
      <Link href={`/applications/${item.applicationId}`} draggable={false} className="block rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900">
        <ItemCard item={item} />
      </Link>
    </div>
  );
}

const cardBase = "block cursor-grab rounded-lg border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800";

function ItemCard({ item }: { item: WeekItem }) {
  if (item.type === "event") {
    return (
      <span className={`${cardBase} ${item.done ? "opacity-50" : ""}`}>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-nowrap">
          <span className={`rounded px-1.5 py-0.5 font-medium ${EVENT_KIND_BADGE_CLASS[item.kind]}`}>
            {EVENT_KIND_LABEL[item.kind]}
          </span>
          <span className="text-zinc-500 tabular-nums">{item.time ?? "시간 미정"}</span>
          {item.done && <span className="text-zinc-400">완료</span>}
        </span>
        <span className={`mt-1 block truncate font-medium ${item.done ? "line-through" : ""}`}>{item.company}</span>
        <span className="block truncate text-zinc-500">{item.title}</span>
      </span>
    );
  }

  if (item.type === "status") {
    return (
      <span className={cardBase}>
        <span className="block truncate font-medium">{item.company}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <StatusBadge status={item.from} />
          <span className="text-zinc-400">→</span>
          <StatusBadge status={item.to} />
        </span>
      </span>
    );
  }

  return (
    <span className={cardBase}>
      <span className="block text-zinc-500">신규 지원</span>
      <span className="block truncate font-medium">{item.company}</span>
      <span className="block truncate text-zinc-500">{item.position}</span>
    </span>
  );
}
