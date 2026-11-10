// 여러 테이블을 한 번에 바꾸는 SQL. neon-http 드라이버에는 대화형 트랜잭션이 없어서
// CTE(WITH) 한 문장으로 묶어 원자적으로 처리한다. 값은 모두 파라미터로 들어간다.
// 바꾸면 실제 DB에 한 번 실행해 본다 (AGENTS.md).
// 모든 문장은 첫 인자로 계정 id를 받고, 기준이 되는 지원 건을 그 계정 것으로 좁힌다
// (다른 계정의 id를 보내면 0행 = 기존의 "대상 없음"과 같다).
import { sql } from "drizzle-orm";
import type { ApplicationCreateInput, HistoryEditInput, StatusChangeInput } from "@/lib/application-input";

/**
 * 지원 건 저장 + 첫 상태 이력 기록. 결과 행: { id }
 * 첫 이력의 날짜는 지원일, 지원일이 없으면(관심 등) 오늘.
 */
export function insertApplicationWithHistory(accountId: number, data: ApplicationCreateInput, today: string) {
  return sql`
    with inserted as (
      insert into applications (account_id, company, position, job_url, source, status, applied_at, memo)
      values (${accountId}, ${data.company}, ${data.position}, ${data.jobUrl}, ${data.source},
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
export function changeStatusWithHistory(accountId: number, applicationId: number, input: StatusChangeInput) {
  const to = sql`${input.toStatus}::application_status`;
  const on = sql`${input.changedOn}::date`;
  return sql`
    with prev as (
      select id, status from applications where id = ${applicationId} and account_id = ${accountId}
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

/**
 * 상태 이력 수정 (변경일·메모). 결과 행: { id }
 * 이 이력이 지원일을 정한 이력(첫 등록 또는 관심에서 넘어온 변경)이고
 * 지원일이 이 이력의 변경일과 같으면, 지원일도 새 날짜로 맞춘다.
 */
export function updateHistoryEntry(
  accountId: number,
  applicationId: number,
  historyId: number,
  // note를 빼면(undefined) 메모는 그대로 둔다 (주간 화면에서 날짜만 옮길 때)
  input: Pick<HistoryEditInput, "changedOn"> & { note?: HistoryEditInput["note"] },
) {
  const on = sql`${input.changedOn}::date`;
  const note = input.note === undefined ? sql`sc.note` : sql`${input.note}::text`;
  return sql`
    with old as (
      select id, application_id, from_status, to_status, changed_on
      from status_changes
      where id = ${historyId} and application_id = ${applicationId}
        and exists (select 1 from applications where id = ${applicationId} and account_id = ${accountId})
    ),
    synced as (
      update applications a
      set applied_at = ${on}, updated_at = now()
      from old
      where a.id = old.application_id
        and old.to_status <> 'interested'
        and (old.from_status is null or old.from_status = 'interested')
        and a.status <> 'interested'
        and a.applied_at = old.changed_on
      returning a.id
    )
    update status_changes sc
    set changed_on = ${on}, note = ${note}
    from old
    where sc.id = old.id
    returning sc.id`;
}

/**
 * 가장 최근 상태 변경 삭제 = 이전 상태로 되돌리기. 결과 행: { id }
 * 첫 등록 이력(from_status가 null)과 최근이 아닌 이력은 지우지 않는다 (흐름이 끊기므로).
 * 관심으로 되돌아가면 지원일을 비운다.
 */
export function deleteLatestHistoryEntry(accountId: number, applicationId: number, historyId: number) {
  return sql`
    with target as (
      select sc.id, sc.application_id, sc.from_status
      from status_changes sc
      where sc.id = ${historyId}
        and sc.application_id = ${applicationId}
        and sc.from_status is not null
        and exists (select 1 from applications where id = ${applicationId} and account_id = ${accountId})
        and not exists (
          select 1 from status_changes later
          where later.application_id = sc.application_id
            and (later.changed_at, later.id) > (sc.changed_at, sc.id)
        )
    ),
    reverted as (
      update applications a
      set status = t.from_status,
          applied_at = case when t.from_status = 'interested' then null else a.applied_at end,
          updated_at = now()
      from target t
      where a.id = t.application_id
      returning a.id
    )
    delete from status_changes
    where id in (select id from target) and exists (select 1 from reverted)
    returning id`;
}

/**
 * 지원일 옮기기 (주간 화면 드래그). 결과 행: { id }
 * 지원일을 정한 이력(첫 등록 또는 관심에서 넘어온 변경)의 변경일도 같이 옮긴다
 * (updateHistoryEntry의 반대 방향 동기화). 지원 전(관심)이거나 지원일이 없으면 아무것도 바꾸지 않는다.
 */
export function moveAppliedDate(accountId: number, applicationId: number, ymd: string) {
  const on = sql`${ymd}::date`;
  return sql`
    with app as (
      select id, applied_at
      from applications
      where id = ${applicationId} and account_id = ${accountId} and status <> 'interested' and applied_at is not null
    ),
    synced as (
      update status_changes sc
      set changed_on = ${on}
      from app
      where sc.application_id = app.id
        and sc.to_status <> 'interested'
        and (sc.from_status is null or sc.from_status = 'interested')
        and sc.changed_on = app.applied_at
      returning sc.id
    )
    update applications a
    set applied_at = ${on}, updated_at = now()
    from app
    where a.id = app.id
    returning a.id`;
}
