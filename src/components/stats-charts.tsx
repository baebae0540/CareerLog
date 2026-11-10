// 통계 화면 그래프. 라이브러리 없이 HTML·Tailwind·인라인 SVG로 그린다 (서버 컴포넌트, JS 없음).
// 규칙: 막대는 24px 이하·위쪽만 둥글게, 숫자 글자는 데이터 색을 입지 않는다, 마우스·키보드 포커스로 자세한 값을 본다.
import Link from "next/link";
import { formatWeekRange } from "@/lib/dates";
import type { FunnelRow, SourceRow } from "@/lib/stats";
import { TREND_METRICS, type TrendWeek } from "@/lib/trend";
import { formatRate } from "@/lib/stats";
import { STATUS_LABEL } from "@/lib/labels";

/** 비율 하나를 가로 막대로 (같은 파랑 계열의 연한 바탕 위에 채움) */
export function Meter({ rate, label }: { rate: number | null; label: string }) {
  const pct = Math.round((rate ?? 0) * 100);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 w-full rounded-full bg-blue-100 dark:bg-blue-950"
    >
      {pct > 0 && <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${pct}%` }} />}
    </div>
  );
}

/** 마우스를 올리거나 포커스하면 보이는 말풍선 */
function Tip({ children, align = "center" }: { children: React.ReactNode; align?: "start" | "center" | "end" }) {
  const pos = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" }[align];
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute -top-2 z-10 hidden -translate-y-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg group-hover:block group-focus-visible:block dark:border-zinc-700 dark:bg-zinc-900 ${pos}`}
    >
      {children}
    </span>
  );
}

/**
 * 단계별 세로 막대 + 막대 사이의 흐름 띠.
 * 막대 높이 = 지원 대비 건수, 띠는 앞 단계에서 다음 단계로 남은 양을 잇고 가운데에 전환율을 적는다.
 */
export function FunnelChart({ stages }: { stages: FunnelRow[] }) {
  const total = stages[0].count;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const columns = stages.flatMap((_, k) => (k === 0 ? ["24px"] : ["minmax(0,1fr)", "24px"])).join(" ");

  return (
    <div className="pt-8">
      {/* 그림 영역: 막대 위 숫자 자리를 위해 위쪽을 비운다 */}
      <div
        className="relative grid h-44 border-b border-zinc-200 dark:border-zinc-800"
        style={{ gridTemplateColumns: columns }}
      >
        {stages.map((s, k) => {
          const h = pct(s.count);
          const prev = stages[k - 1];
          return [
            k > 0 && prev && (
              <div key={`band-${s.status}`} className="relative" aria-hidden>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <polygon
                    points={`0,${100 - pct(prev.count)} 100,${100 - h} 100,100 0,100`}
                    className="fill-blue-500/10 dark:fill-blue-400/10"
                  />
                </svg>
              </div>
            ),
            <div
              key={s.status}
              tabIndex={0}
              aria-label={`${STATUS_LABEL[s.status]} ${s.count}건`}
              className="group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {/* 막대 (건수가 0이면 그리지 않는다) */}
              {s.count > 0 && (
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t bg-blue-600 transition-opacity group-hover:opacity-80 dark:bg-blue-500"
                  style={{ height: `${h}%` }}
                />
              )}
              {/* 막대 끝의 건수 (0건은 흐리게) */}
              <span
                data-count
                className={`absolute left-1/2 -translate-x-1/2 text-sm font-semibold tabular-nums ${s.count === 0 ? "text-zinc-400 dark:text-zinc-600" : ""}`}
                style={{ bottom: `calc(${h}% + 4px)` }}
              >
                {s.count}
              </span>
              <Tip align={k === 0 ? "start" : k === stages.length - 1 ? "end" : "center"}>
                <span className="font-semibold">{s.count}건</span>{" "}
                <span className="text-zinc-500">{STATUS_LABEL[s.status]}</span>
                <br />
                <span className="text-zinc-500">
                  이전 단계 대비 {formatRate(s.fromPrev)} · 지원 대비 {formatRate(s.fromFirst)}
                </span>
              </Tip>
            </div>,
          ];
        })}
      </div>
      {/* 가로축: 단계 이름을 막대 가운데에 */}
      <div className="grid h-6" style={{ gridTemplateColumns: columns }}>
        {stages.map((s, k) => [
          k > 0 && <span key={`gap-${s.status}`} />,
          <span key={s.status} className="relative">
            <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-300">
              {STATUS_LABEL[s.status]}
            </span>
          </span>,
        ])}
      </div>
      {/* 전환율: 그림 위에 얹지 않고 단계 이름 아래 줄, 두 막대 사이 가운데에 */}
      <div className="mt-1 grid h-6" style={{ gridTemplateColumns: columns }}>
        {stages.map((s, k) => [
          k > 0 && (
            <span key={`rate-${s.status}`} className="flex items-center justify-center">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] whitespace-nowrap text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
                → {formatRate(s.fromPrev)}
              </span>
            </span>
          ),
          <span key={`rate-gap-${s.status}`} />,
        ])}
      </div>
    </div>
  );
}

export type StatusPart = { key: string; label: string; value: number; fill: string; ink: string };

/** 하나의 전체(지원 건)를 상태별 덩어리로 나눈 두꺼운 막대. 덩어리 안에 건수, 아래에 범례 */
export function StatusBar({ parts }: { parts: StatusPart[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-7 gap-0.5" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}건`).join(", ")}>
        {shown.map((p, i) => {
          const share = p.value / total;
          return (
            <div
              key={p.key}
              tabIndex={0}
              className={`group relative flex min-w-0 items-center rounded px-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${p.fill}`}
              style={{ flexGrow: p.value, flexBasis: 0 }}
            >
              {/* 좁아서 안 들어가면 적지 않는다 (말풍선과 범례에 있다) */}
              {share >= 0.1 && (
                <span className={`text-xs font-semibold whitespace-nowrap tabular-nums ${p.ink}`}>{formatRate(share)}</span>
              )}
              <Tip align={i === 0 ? "start" : i === shown.length - 1 ? "end" : "center"}>
                <span className="font-semibold">{p.value}건</span> <span className="text-zinc-500">{p.label}</span>
              </Tip>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${p.fill}`} aria-hidden />
            <span className="text-zinc-600 dark:text-zinc-300">{p.label}</span>
            <span data-count className="font-semibold tabular-nums">
              {p.value}건
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SOURCE_RATES = [
  { key: "documentPassed", label: "서류 통과" },
  { key: "interview", label: "면접 진출" },
  { key: "offer", label: "합격" },
] as const;

/**
 * 지원 경로별 성과. 넓은 화면은 표(경로·지원·비율 3칸), 좁은 화면은 경로마다 카드처럼 쌓는다.
 * 비율은 그 경로의 지원 대비, 막대는 Meter와 같은 파랑.
 */
export function SourceTable({ rows }: { rows: SourceRow[] }) {
  const grid = "sm:grid sm:grid-cols-[minmax(0,1.4fr)_3.5rem_repeat(3,minmax(0,1fr))] sm:items-center sm:gap-x-4";
  return (
    <div role="table" aria-label="지원 경로별 성과" className="text-sm">
      <div role="row" className={`hidden pb-2 text-xs text-zinc-500 ${grid}`}>
        <span role="columnheader">경로</span>
        <span role="columnheader" className="text-right">지원</span>
        {SOURCE_RATES.map((r) => (
          <span role="columnheader" key={r.key}>
            {r.label}
          </span>
        ))}
      </div>
      <div className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {rows.map((row) => (
          <div role="row" key={row.source ?? ""} className={`flex flex-col gap-2 py-3 ${grid}`}>
            <div className="flex items-baseline justify-between gap-3 sm:contents">
              <span role="cell" className={`min-w-0 truncate font-medium ${row.source === null ? "text-zinc-500" : ""}`} title={row.source ?? undefined}>
                {row.source ?? "미입력"}
              </span>
              <span role="cell" className="shrink-0 text-right tabular-nums">
                {row.total}건
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:contents">
              {SOURCE_RATES.map((r) => {
                const n = row[r.key];
                const rate = row.total === 0 ? null : n / row.total;
                return (
                  <div role="cell" key={r.key} className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-baseline justify-between gap-1 text-xs tabular-nums">
                      <span className="text-zinc-500 sm:hidden">{r.label}</span>
                      <span>
                        <span className="font-semibold">{formatRate(rate)}</span>
                        <span className="text-zinc-500"> {n}/{row.total}</span>
                      </span>
                    </span>
                    <Meter rate={rate} label={`${row.source ?? "미입력"} ${r.label} ${formatRate(rate)}`} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "2026-11-08" → "11/8" */
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

/**
 * 주별 추이: 지표마다 한 줄씩 주별 세로 막대 (작은 그래프 여러 개).
 * 세 줄이 같은 높이 기준을 써서 줄끼리 크기를 비교할 수 있다. 막대를 누르면 그 주의 주간 화면으로 간다.
 */
export function TrendChart({ weeks }: { weeks: TrendWeek[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => TREND_METRICS.map((m) => w[m.key])));
  const cols = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };
  const last = weeks.length - 1;

  return (
    <div className="flex flex-col gap-4">
      {TREND_METRICS.map((m) => {
        const total = weeks.reduce((a, w) => a + w[m.key], 0);
        return (
          <div key={m.key} className="flex flex-col gap-1" data-metric={m.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{m.label}</span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {weeks.length}주 합계 <span data-total className="font-semibold text-zinc-900 dark:text-zinc-100">{total}</span>
              </span>
            </div>
            {/* 위쪽 여백은 막대 위 숫자 자리 */}
            <div className="grid h-16 border-b border-zinc-200 pt-4 dark:border-zinc-800" style={cols}>
              {weeks.map((w, i) => {
                const v = w[m.key];
                const h = (v / max) * 100;
                return (
                  <Link
                    key={w.start}
                    href={`/week?start=${w.start}`}
                    aria-label={`${shortDate(w.start)} 주 ${m.label} ${v}건`}
                    data-value={v}
                    className="group relative mx-auto h-full w-full max-w-6 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {v > 0 && (
                      <span
                        className={`absolute inset-x-[15%] bottom-0 rounded-t transition-opacity group-hover:opacity-80 ${
                          i === last ? "bg-blue-400 dark:bg-blue-400/70" : "bg-blue-600 dark:bg-blue-500"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    )}
                    {v > 0 && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums"
                        style={{ bottom: `calc(${h}% + 2px)` }}
                      >
                        {v}
                      </span>
                    )}
                    <Tip align={i < 2 ? "start" : i > last - 2 ? "end" : "center"}>
                      <span className="font-semibold">{v}건</span> <span className="text-zinc-500">{m.label}</span>
                      <br />
                      <span className="text-zinc-500">
                        {formatWeekRange(w.start)}
                        {i === last && " (이번 주, 진행 중)"}
                      </span>
                    </Tip>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* 가로축: 주 시작일. 좁은 화면은 한 주 걸러 표시 */}
      <div className="-mt-3 grid text-[11px] text-zinc-500 tabular-nums" style={cols}>
        {weeks.map((w, i) => (
          <span key={w.start} className={`text-center whitespace-nowrap ${(last - i) % 2 === 1 ? "invisible sm:visible" : ""}`}>
            {i === last ? "이번 주" : shortDate(w.start)}
          </span>
        ))}
      </div>
    </div>
  );
}
