// 여러 테이블을 한 번에 바꾸는 SQL. neon-http 드라이버에는 대화형 트랜잭션이 없어서
// CTE(WITH) 한 문장으로 묶어 원자적으로 처리한다. 값은 모두 파라미터로 들어간다.
import { sql } from "drizzle-orm";
import type { ApplicationCreateInput } from "@/lib/application-input";

/** 지원 건 저장 + 첫 상태 이력 기록. 결과 행: { id } */
export function insertApplicationWithHistory(data: ApplicationCreateInput) {
  return sql`
    with inserted as (
      insert into applications (company, position, job_url, source, status, applied_at, memo)
      values (${data.company}, ${data.position}, ${data.jobUrl}, ${data.source},
              ${data.status}, ${data.appliedAt}, ${data.memo})
      returning id, status
    )
    insert into status_changes (application_id, from_status, to_status)
    select id, null, status from inserted
    returning application_id as id`;
}
