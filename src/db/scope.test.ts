// 계정 범위 조건이 select·update·delete 안에서 의도한 SQL로 바뀌는지 (DB 연결 없이 toSQL로 확인)
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { describe, expect, it } from "vitest";
import { applicationImages, applications, events } from "@/db/schema";
import { inAccount, ownApplication } from "@/db/scope";

const db = drizzle.mock();

describe("계정 범위 조건", () => {
  it("ownApplication: 계정 + (주면) 지원 건 id", () => {
    const q = db.select({ id: applications.id }).from(applications).where(ownApplication(7, 3)).toSQL();
    expect(q.sql).toContain(`"applications"."account_id" = $1`);
    expect(q.sql).toContain(`"applications"."id" = $2`);
    expect(q.params).toEqual([7, 3]);
    const all = db.select({ id: applications.id }).from(applications).where(ownApplication(7)).toSQL();
    expect(all.sql).not.toContain(`"applications"."id" =`);
  });

  it("inAccount: update에서도 하위 테이블의 application_id를 지원 건과 비교한다", () => {
    const q = db
      .update(events)
      .set({ done: true })
      .where(and(eq(events.id, 1), inAccount(7, events.applicationId)))
      .toSQL();
    expect(q.sql).toContain(
      `exists (select 1 from "applications" where "applications"."id" = "events"."application_id" and "applications"."account_id" = $`,
    );
    expect(q.params).toContain(7);
  });

  it("inAccount: delete에서도 같다", () => {
    const q = db
      .delete(applicationImages)
      .where(inAccount(9, applicationImages.applicationId))
      .toSQL();
    expect(q.sql).toContain(`"applications"."id" = "application_images"."application_id"`);
    expect(q.params).toEqual([9]);
  });
});
