import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, statusChanges, type ApplicationStatus } from "@/db/schema";

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
    .orderBy(asc(statusChanges.changedAt), asc(statusChanges.id));
}
