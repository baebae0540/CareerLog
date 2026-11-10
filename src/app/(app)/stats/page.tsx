import Link from "next/link";
import { redirect } from "next/navigation";
import { getStatsData, getWeekData } from "@/db/queries";
import { FunnelChart, Meter, SourceTable, StatusBar, TrendChart, type StatusPart } from "@/components/stats-charts";
import { cardClass } from "@/components/ui";
import { formatWeekRange, formatYmd, todayInSeoul, weekStart } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/labels";
import { requireLogin } from "@/lib/session";
import { buildWeeklyTrend, TREND_METRICS, TREND_WEEKS, trendFrom } from "@/lib/trend";
import { buildFunnel, buildSourceStats, formatRate, parsePeriod, periodFrom, PERIOD_LABEL, STATS_PERIODS } from "@/lib/stats";

// 화면 구성: ① 핵심 숫자 4칸(비율 막대) → ② 단계별 전환 그래프 → ③ 지금 상태 막대 → ④ 지원 경로별 → ⑤ 주별 추이(기간 선택과 무관하게 최근 12주) → 집계 안내.
// 단계는 순서가 있는 한 묶음이라 한 가지 색(파랑)으로 높이만 비교한다. 그래프는 src/components/stats-charts.tsx
export default async function StatsPage(props: PageProps<"/stats">) {
  const { accountId } = await requireLogin();
  const period = parsePeriod((await props.searchParams).period);
  if (period === null) redirect("/stats");

  const today = todayInSeoul();
  const from = periodFrom(period, today);
  const trendStart = trendFrom(weekStart(today));
  const [{ apps, changes, interested }, trendData] = await Promise.all([
    getStatsData(accountId, from),
    getWeekData(accountId, trendStart, TREND_WEEKS * 7),
  ]);
  const trend = buildWeeklyTrend(trendStart, TREND_WEEKS, trendData);
  const { stages, outcome } = buildFunnel(apps, changes);
  const sources = buildSourceStats(apps, changes);
  const total = stages[0].count;
  const [, docPassed, interview, , offer] = stages;

  // 순서: 진행 중 · 합격 · 보류 · 불합격 (초록과 빨강이 붙지 않게 회색을 사이에 둔다. 색각 검사 통과)
  const parts: StatusPart[] = [
    { key: "active", label: "진행 중", value: outcome.active, fill: "bg-blue-600 dark:bg-blue-500", ink: "text-white" },
    { key: "offer", label: "합격", value: outcome.offer, fill: "bg-green-600", ink: "text-white" },
    { key: "onHold", label: "보류", value: outcome.onHold, fill: "bg-zinc-400 dark:bg-zinc-500", ink: "text-zinc-900 dark:text-white" },
    { key: "rejected", label: "불합격", value: outcome.rejected, fill: "bg-red-600 dark:bg-red-500", ink: "text-white" },
  ];


  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">통계</h1>
          <p className="text-sm text-zinc-500">
            {from ? `지원일 ${formatYmd(from)} ~ ${formatYmd(today)}` : "전체 기간"}
          </p>
        </div>
        <nav aria-label="기간" className="flex gap-2">
          {STATS_PERIODS.map((p) => (
            <Link
              key={p}
              href={p === "all" ? "/stats" : `/stats?period=${p}`}
              aria-current={p === period ? "page" : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap ${
                p === period
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </nav>
      </div>

      {total === 0 ? (
        <div className={`${cardClass} px-6 py-16 text-center text-zinc-500`}>이 기간에 지원한 건이 없습니다.</div>
      ) : (
        <>
          {/* ① 핵심 숫자: 비율은 모두 '지원 대비', 아래 막대로 크기를 함께 본다 */}
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="지원" value={`${total}건`} sub={`진행 중 ${outcome.active}건`} />
            <StatTile label="서류 통과율" value={formatRate(docPassed.fromFirst)} sub={`${docPassed.count} / ${total}건`} rate={docPassed.fromFirst} />
            <StatTile label="면접 진출률" value={formatRate(interview.fromFirst)} sub={`${interview.count} / ${total}건`} rate={interview.fromFirst} />
            <StatTile label="합격률" value={formatRate(offer.fromFirst)} sub={`${offer.count} / ${total}건`} rate={offer.fromFirst} />
          </dl>

          {/* ② 단계별 전환 그래프 */}
          <div className={`${cardClass} flex flex-col gap-2 p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="font-semibold">단계별 전환</h2>
              <span className="text-xs text-zinc-500">→ % = 이전 단계에서 넘어간 비율</span>
            </div>
            <FunnelChart stages={stages} />
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                표로 보기
              </summary>
              <table className="mt-2 w-full text-left tabular-nums">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="py-1 font-normal">단계</th>
                    <th className="py-1 text-right font-normal">건수</th>
                    <th className="py-1 text-right font-normal">이전 단계 대비</th>
                    <th className="py-1 text-right font-normal">지원 대비</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {stages.map((s) => (
                    <tr key={s.status}>
                      <td className="py-1.5">{STATUS_LABEL[s.status]}</td>
                      <td className="py-1.5 text-right">{s.count}</td>
                      <td className="py-1.5 text-right">{formatRate(s.fromPrev)}</td>
                      <td className="py-1.5 text-right">{formatRate(s.fromFirst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>

          {/* ③ 지금 상태 */}
          <div className={`${cardClass} flex flex-col gap-4 p-4 sm:p-6`}>
            <h2 className="font-semibold">지금 상태</h2>
            <StatusBar parts={parts} />
          </div>

          {/* ④ 지원 경로별: 경로마다 지원 대비 비율 */}
          <div className={`${cardClass} flex flex-col gap-3 p-4 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="font-semibold">지원 경로별</h2>
              <span className="text-xs text-zinc-500">% = 그 경로로 지원한 건 대비</span>
            </div>
            <SourceTable rows={sources} />
            <p className="text-xs text-zinc-500">
              경로 이름은 띄어쓰기·대소문자만 맞춰 묶습니다. 지원이 적은 경로는 한두 건으로 비율이 크게 달라집니다.
            </p>
          </div>
        </>
      )}

      {/* ⑤ 주별 추이: 위의 기간 선택과 상관없이 최근 12주 */}
      <div className={`${cardClass} flex flex-col gap-3 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="font-semibold">주별 추이</h2>
          <span className="text-xs text-zinc-500">최근 {TREND_WEEKS}주 · 기간 선택과 무관 · 막대를 누르면 그 주로</span>
        </div>
        <TrendChart weeks={trend} />
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            표로 보기
          </summary>
          <table className="mt-2 w-full text-left tabular-nums">
            <thead className="text-xs text-zinc-500">
              <tr>
                <th className="py-1 font-normal">주 (일~토)</th>
                {TREND_METRICS.map((m) => (
                  <th key={m.key} className="py-1 text-right font-normal">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {trend.toReversed().map((w) => (
                <tr key={w.start}>
                  <td className="py-1.5">{formatWeekRange(w.start)}</td>
                  {TREND_METRICS.map((m) => (
                    <td key={m.key} className="py-1.5 text-right">
                      {w[m.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <ul className="flex flex-col gap-0.5 text-xs text-zinc-500">
          {TREND_METRICS.map((m) => (
            <li key={m.key}>
              {m.label}: {m.hint}
            </li>
          ))}
          <li>이번 주(연한 막대)는 아직 진행 중입니다.</li>
        </ul>
      </div>

      {/* 집계 안내 */}
      <div className="flex flex-col gap-1 text-xs text-zinc-500">
        <p>
          지원일이 기간 안에 있는 지원 건을 셉니다. 각 지원 건이 지금까지 도달한 가장 높은 단계까지 포함하므로, 면접 후
          불합격이어도 면접에 들어갑니다.
        </p>
        <p>
          관심(지원 전) {interested}건은 빠져 있습니다.{" "}
          {interested > 0 && (
            <Link href="/?status=interested" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
              관심 목록 보기
            </Link>
          )}
        </p>
      </div>
    </section>
  );
}

function StatTile({ label, value, sub, rate }: { label: string; value: string; sub: string; rate?: number | null }) {
  return (
    <div className={`${cardClass} flex flex-col gap-1 p-4`}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="flex flex-1 flex-col gap-2">
        <span className="text-2xl font-bold sm:text-3xl">{value}</span>
        <span className="mt-auto flex flex-col gap-1.5">
          {rate !== undefined && <Meter rate={rate} label={`${label} ${value}`} />}
          <span className="text-xs text-zinc-500 tabular-nums">{sub}</span>
        </span>
      </dd>
    </div>
  );
}
