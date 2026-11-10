// 계정 범위 조건. 지원 건은 account_id로, 하위 행(이력·일정·사진)은 지원 건을 거쳐 계정에 속한다.
// queries.ts와 서버 액션의 모든 조회·변경은 이 조건으로 범위를 좁힌다 (다른 계정의 id를 보내도 0행).
import { and, eq, sql, type AnyColumn } from "drizzle-orm";
import { applications } from "@/db/schema";

/** 이 계정의 지원 건 (id까지 주면 그 한 건) */
export function ownApplication(accountId: number, applicationId?: number) {
  return and(
    eq(applications.accountId, accountId),
    applicationId === undefined ? undefined : eq(applications.id, applicationId),
  );
}

/** 하위 테이블 행의 application_id가 이 계정의 지원 건인지 (update·delete에도 쓸 수 있게 exists로) */
export function inAccount(accountId: number, applicationIdColumn: AnyColumn) {
  return sql`exists (select 1 from ${applications} where ${applications.id} = ${applicationIdColumn} and ${applications.accountId} = ${accountId})`;
}
