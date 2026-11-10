"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { inAccount } from "@/db/scope";
import { moveAppliedDate, updateHistoryEntry } from "@/db/statements";
import { isValidYmd, TIME_ZONE } from "@/lib/dates";
import { requireLogin } from "@/lib/session";
import type { WeekItemType } from "@/lib/week";

/**
 * 주간 화면에서 드래그한 항목의 날짜를 바꾼다. 실패하면 오류 문구를 돌려준다.
 * - 일정: 시각은 그대로 두고 날짜만 (시간 미정이면 그날 00:00)
 * - 상태 변경: 이력의 변경일 (지원일을 정한 이력이면 지원일도 따라감, updateHistoryEntry)
 * - 신규 지원: 지원일 (지원일을 정한 이력도 따라감, moveAppliedDate)
 * 상태 값은 바꾸지 않으므로 changeStatusWithHistory 규칙과 무관하다.
 */
export async function moveWeekItem(
  type: WeekItemType,
  applicationId: number,
  id: number,
  ymd: string,
): Promise<{ error?: string }> {
  const { accountId } = await requireLogin();
  if (!isValidYmd(ymd)) return { error: "날짜가 올바르지 않습니다." };
  const db = getDb();

  let moved: number;
  if (type === "event") {
    // 한국 시간 기준 시:분을 유지한 채 날짜만 바꾼다
    const rows = await db
      .update(events)
      .set({
        startsAt: sql`(${ymd}::date + (${events.startsAt} at time zone ${TIME_ZONE})::time) at time zone ${TIME_ZONE}`,
      })
      .where(and(eq(events.id, id), eq(events.applicationId, applicationId), inAccount(accountId, events.applicationId)))
      .returning({ id: events.id });
    moved = rows.length;
  } else if (type === "status") {
    moved = (await db.execute(updateHistoryEntry(accountId, applicationId, id, { changedOn: ymd }))).rows.length;
  } else if (type === "applied" && id === applicationId) {
    moved = (await db.execute(moveAppliedDate(accountId, applicationId, ymd))).rows.length;
  } else {
    return { error: "알 수 없는 항목입니다." };
  }

  revalidatePath("/week");
  revalidatePath("/");
  revalidatePath(`/applications/${applicationId}`);
  return moved === 0 ? { error: "이미 삭제되었거나 옮길 수 없는 항목입니다." } : {};
}
