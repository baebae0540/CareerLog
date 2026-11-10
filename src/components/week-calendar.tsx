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
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { moveWeekItem } from "@/app/(app)/week/actions";
import { StatusBadge } from "@/components/status-badge";
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
  // 방금 옮긴 항목 (잠깐 파란 테두리로 표시). key는 날짜가 바뀌어도 그대로다.
  const [recentKey, setRecentKey] = useState<string | null>(null);
  const recentTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const built = weeks.map((w) => ({ ...w, ...buildWeek(w.start, optimistic) }));
  const focus = built.find((w) => w.start === focusStart);
  const itemsByKey = new Map(built.flatMap((w) => w.days.flatMap((d) => d.items)).map((i) => [i.key, i]));

  // 드래그 중에는 화면 어디서든 잡은 손 모양 커서
  useEffect(() => {
    document.body.classList.toggle("is-dragging", active !== null);
  }, [active]);
  useEffect(() => () => {
    document.body.classList.remove("is-dragging");
    clearTimeout(recentTimer.current);
  }, []);

  function flashMoved(key: string | null) {
    clearTimeout(recentTimer.current);
    setRecentKey(key);
    if (key) recentTimer.current = setTimeout(() => setRecentKey(null), 1200);
  }

  function onDragStart(e: DragStartEvent) {
    setError(null);
    flashMoved(null);
    setActive(itemsByKey.get(String(e.active.id)) ?? null);
    // 폰에서 길게 눌러 들어 올렸을 때 짧게 진동 (지원하는 기기만, iOS는 무시)
    if (e.activatorEvent.type.startsWith("touch")) navigator.vibrate?.(10);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const item = itemsByKey.get(String(e.active.id));
    const ymd = e.over ? String(e.over.id) : null;
    if (!item || !ymd || ymd === item.ymd) return;

    const move: WeekMove = { type: item.type, id: item.id, ymd };
    // 트랜잭션 안의 setState는 서버 응답 뒤에 반영되므로 강조는 밖에서 바로 켠다
    flashMoved(item.key);
    startTransition(async () => {
      applyMove(move);
      const result = await moveWeekItem(item.type, item.applicationId, item.id, ymd);
      // 실패하면 트랜잭션이 끝날 때 원래 데이터로 돌아간다
      if (result.error) {
        flashMoved(null);
        setError(result.error);
      }
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
                <DayCell
                  key={day.ymd}
                  ymd={day.ymd}
                  today={today}
                  items={day.items}
                  fromYmd={active?.ymd ?? null}
                  recentKey={recentKey}
                />
              ))}
            </ol>
          </section>
        ))}
        <DragOverlay dropAnimation={null}>
          {active && (
            <div className="drag-lift w-40 rounded-lg bg-white shadow-xl ring-2 ring-blue-500/60 dark:bg-zinc-900 dark:shadow-black/60">
              <ItemCard item={active} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/** 요약 4칸 (월간 화면도 같이 쓴다) */
export function Summary({ summary }: { summary: WeekSummary }) {
  const cells = [
    { label: "신규 지원", value: `${summary.applied}` },
    { label: "일정 (완료/전체)", value: `${summary.eventsDone}/${summary.events}` },
    { label: "상태 변경", value: `${summary.statusChanges}` },
    { label: "합격 · 불합격", value: `${summary.offers} · ${summary.rejections}` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className={`${cellBase} border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950`}>
          <dt className="text-xs text-zinc-500">{c.label}</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// 칸 테두리·배경은 드래그 상태마다 다르게 고르므로 cardClass(bg-white 고정)를 쓰지 않는다
const cellBase = "rounded-xl border";

function DayCell({
  ymd,
  today,
  items,
  fromYmd,
  recentKey,
}: {
  ymd: string;
  today: string;
  items: WeekItem[];
  fromYmd: string | null; // 드래그 중인 항목의 원래 날짜 (드래그 중이 아니면 null)
  recentKey: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ymd });
  const isToday = ymd === today;
  const dragging = fromYmd !== null;
  // 원래 날짜 칸에 놓으면 아무 일도 없으니 강조하지 않는다
  const target = isOver && dragging && ymd !== fromYmd;
  const [, m, d] = ymd.split("-").map(Number);
  const weekday = weekdayName(ymd);

  const tone = target
    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-950/50"
    : isToday
      ? "border-blue-500 bg-white ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-zinc-950"
      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <li
      ref={setNodeRef}
      data-ymd={ymd}
      data-drop-target={target ? "" : undefined}
      aria-current={isToday ? "date" : undefined}
      className={`${cellBase} ${tone} relative flex min-w-0 flex-col gap-2 p-3 transition-[background-color,border-color,box-shadow] duration-150 lg:min-h-28 ${
        dragging && !target ? "border-dashed" : ""
      } ${items.length === 0 ? "max-lg:py-2" : ""}`}
    >
      <p
        className={`text-sm font-semibold ${
          isToday || target
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
      {target && (
        // 칸 크기를 바꾸지 않도록 겹쳐 그린다 (크기가 바뀌면 놓을 칸이 흔들린다).
        // 넓은 화면은 칸이 좁아 날짜를 가리지 않게 아래쪽에, 좁은 화면(세로 목록)은 오른쪽 위에.
        <span className="pointer-events-none absolute rounded-full bg-blue-600 px-2 py-0.5 text-center text-[11px] font-semibold text-white shadow-sm max-lg:top-2.5 max-lg:right-3 lg:inset-x-2 lg:bottom-2 dark:bg-blue-500">
          여기로 이동
        </span>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <DraggableItem item={item} recent={item.key === recentKey} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DraggableItem({ item, recent }: { item: WeekItem; recent: boolean }) {
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
      data-recent={recent ? "" : undefined}
      // 끌고 있는 동안 원래 자리는 같은 크기의 점선 빈칸으로 남긴다 (어디서 왔는지 보이고 칸 높이도 그대로)
      className={`touch-manipulation rounded-lg select-none [-webkit-touch-callout:none] ${
        isDragging
          ? "bg-zinc-50 outline-2 -outline-offset-2 outline-zinc-300 outline-dashed dark:bg-zinc-900 dark:outline-zinc-700 [&>*]:invisible"
          : ""
      } ${recent ? "just-moved" : ""}`}
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
