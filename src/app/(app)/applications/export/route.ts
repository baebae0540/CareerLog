import { listApplications } from "@/db/queries";
import { applicationsCsv } from "@/lib/csv";
import { todayInSeoul } from "@/lib/dates";
import { parseStatus } from "@/lib/labels";
import { isLoggedIn } from "@/lib/session";

/** 지원 목록 CSV 내려받기 (?status=로 필터). 로그인한 사람만 (proxy만 믿지 않는다). */
export async function GET(req: Request) {
  if (!(await isLoggedIn())) return new Response("로그인이 필요합니다.", { status: 401 });

  const status = parseStatus(new URL(req.url).searchParams.get("status") ?? undefined);
  const csv = applicationsCsv(await listApplications(status));
  const name = `careerlog-${status ? `${status}-` : ""}${todayInSeoul()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
