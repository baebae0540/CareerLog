import "server-only";
import { and, asc, count, desc, eq, gte, lt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, events, statusChanges, type ApplicationStatus } from "@/db/schema";
import { addDays, seoulDateTime } from "@/lib/dates";
import type { WeekData } from "@/lib/week";

export async function listApplications(status?: ApplicationStatus) {
  return getDb()
    .select()
    .from(applications)
    .where(status ? eq(applications.status, status) : undefined)
    .orderBy(desc(applications.updatedAt), desc(applications.id));
}

/** 상태별 건수 (필터 탭에 표시) */
export async function countByStatus() {
  const rows = await getDb()
    .select({ status: applications.status, total: count() })
    .from(applications)
    .groupBy(applications.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.total])) as Partial<
    Record<ApplicationStatus, number>
  >;
}

export async function getApplication(id: number) {
  const [row] = await getDb().select().from(applications).where(eq(applications.id, id));
  return row;
}

export async function getStatusHistory(applicationId: number) {
  return getDb()
    .select()
    .from(statusChanges)
    .where(eq(statusChanges.applicationId, applicationId))
    // 기록한 순서대로 (변경일을 과거로 고를 수 있어서 변경일 순이면 흐름이 뒤집힐 수 있다)
    .orderBy(asc(statusChanges.changedAt), asc(statusChanges.id));
}

/** 지원 건의 일정 (시각 순) */
export async function getEvents(applicationId: number) {
  return getDb()
    .select()
    .from(events)
    .where(eq(events.applicationId, applicationId))
    .orderBy(asc(events.startsAt), asc(events.id));
}

/** 주간 화면 재료: start부터 days일 동안(한국 시간)의 일정·상태 변경·신규 지원 */
export async function getWeekData(start: string, days = 7): Promise<WeekData> {
  const end = addDays(start, days - 1);
  const db = getDb();
  const [weekEvents, weekChanges, applied] = await Promise.all([
    db
      .select({
        id: events.id,
        applicationId: events.applicationId,
        company: applications.company,
        kind: events.kind,
        title: events.title,
        startsAt: events.startsAt,
        allDay: events.allDay,
        done: events.done,
      })
      .from(events)
      .innerJoin(applications, eq(events.applicationId, applications.id))
      .where(and(gte(events.startsAt, seoulDateTime(start)), lt(events.startsAt, seoulDateTime(addDays(start, days))))),
    db
      .select({
        id: statusChanges.id,
        applicationId: statusChanges.applicationId,
        company: applications.company,
        fromStatus: statusChanges.fromStatus,
        toStatus: statusChanges.toStatus,
        changedOn: statusChanges.changedOn,
        changedAt: statusChanges.changedAt,
      })
      .from(statusChanges)
      .innerJoin(applications, eq(statusChanges.applicationId, applications.id))
      .where(and(gte(statusChanges.changedOn, start), lte(statusChanges.changedOn, end))),
    db
      .select({
        id: applications.id,
        company: applications.company,
        position: applications.position,
        appliedAt: applications.appliedAt,
      })
      .from(applications)
      // 관심(지원 전)은 appliedAt이 null이라 자연히 빠진다
      .where(and(gte(applications.appliedAt, start), lte(applications.appliedAt, end))),
  ]);
  return {
    events: weekEvents,
    statusChanges: weekChanges,
    applied: applied.filter((a): a is typeof a & { appliedAt: string } => a.appliedAt !== null),
  };
}
