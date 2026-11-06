// 여러 테이블을 한 번에 바꾸는 SQL. neon-http 드라이버에는 대화형 트랜잭션이 없어서
// CTE(WITH) 한 문장으로 묶어 원자적으로 처리한다. 값은 모두 파라미터로 들어간다.
// 바꾸면 실제 DB에 한 번 실행해 본다 (AGENTS.md).
import { sql } from "drizzle-orm";
import type { ApplicationCreateInput, StatusChangeInput } from "@/lib/application-input";

/**
 * 지원 건 저장 + 첫 상태 이력 기록. 결과 행: { id }
 * 첫 이력의 날짜는 지원일, 지원일이 없으면(관심 등) 오늘.
 */
export function insertApplicationWithHistory(data: ApplicationCreateInput, today: string) {
  return sql`
    with inserted as (
      insert into applications (company, position, job_url, source, status, applied_at, memo)
      values (${data.company}, ${data.position}, ${data.jobUrl}, ${data.source},
              ${data.status}, ${data.appliedAt}, ${data.memo})
      returning id, status, applied_at
    )
    insert into status_changes (application_id, from_status, to_status, changed_on)
    select id, null, status, coalesce(applied_at, ${today}::date) from inserted
    returning application_id as id`;
}

/**
 * 상태 변경 + 이력 기록. 결과 행: { id } (없으면 대상이 없거나 이미 같은 상태)
 * 지원일 규칙:
 *  - 관심으로 바꾸면 지원일을 비운다 (관심 = 지원 전)
 *  - 지원 이후 단계로 바꿀 때 지원일이 비어 있으면 변경일로 채운다
 */
export function changeStatusWithHistory(applicationId: number, input: StatusChangeInput) {
  const to = sql`${input.toStatus}::application_status`;
  const on = sql`${input.changedOn}::date`;
  return sql`
    with prev as (
      select id, status from applications where id = ${applicationId}
    ),
    updated as (
      update applications a
      set status = ${to},
          applied_at = case
            when ${to} = 'interested' then null
            when a.applied_at is null then ${on}
            else a.applied_at
          end,
          updated_at = now()
      from prev
      where a.id = prev.id and prev.status <> ${to}
      returning a.id, prev.status as from_status
    )
    insert into status_changes (application_id, from_status, to_status, note, changed_on)
    select id, from_status, ${to}, ${input.note}::text, ${on} from updated
    returning application_id as id`;
}
