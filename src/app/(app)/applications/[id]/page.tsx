import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplication, getEvents, getStatusHistory } from "@/db/queries";
import { DeleteForm } from "@/components/delete-button";
import { EventAddForm } from "@/components/event-form";
import { EventItem } from "@/components/event-item";
import { HistoryItem } from "@/components/history-item";
import { StatusBadge } from "@/components/status-badge";
import { StatusChangeForm } from "@/components/status-change-form";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { isBeforeApplying, isBeforeInterview, parseId } from "@/lib/application-input";
import { formatDateTime, formatYmd, seoulParts, todayInSeoul } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/labels";
import { requireLogin } from "@/lib/session";
import {
  changeStatus,
  createEvent,
  deleteApplication,
  deleteEvent,
  deleteHistory,
  setEventDone,
  updateEvent,
  updateHistory,
} from "../actions";

export default async function ApplicationDetailPage(props: PageProps<"/applications/[id]">) {
  await requireLogin();
  const id = parseId((await props.params).id);
  if (!id) notFound();

  const [app, history, events] = await Promise.all([getApplication(id), getStatusHistory(id), getEvents(id)]);
  if (!app) notFound();
  const today = todayInSeoul();
  const latestId = history.at(-1)?.id;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 지원 목록
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{app.company}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-zinc-500">{app.position}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/applications/${app.id}/edit`} className={secondaryButtonClass}>
            수정
          </Link>
          <DeleteForm
            action={deleteApplication.bind(null, app.id)}
            confirmMessage={`'${app.company}' 지원 건을 삭제할까요?\n상태 이력과 일정도 함께 삭제되며 되돌릴 수 없습니다.`}
          />
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="px-5 pt-5 text-sm font-semibold sm:px-6">지원 정보</h2>
        <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-3 sm:px-6">
          <Item label="지원일">{app.appliedAt && !isBeforeApplying(app.status) ? formatYmd(app.appliedAt) : "지원 전"}</Item>
          <Item label="지원 경로">{app.source ?? "-"}</Item>
          <Item label="공고 링크">
            {app.jobUrl ? (
              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                공고 열기 ↗
              </a>
            ) : (
              "-"
            )}
          </Item>
          <div className="sm:col-span-3">
            <Item label="메모">
              {app.memo ? <p className="whitespace-pre-wrap">{app.memo}</p> : <span className="text-zinc-400">메모 없음</span>}
            </Item>
          </div>
        </dl>
      </div>

      <div className={cardClass}>
        <div className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">일정</h2>
          <div className="flex flex-col gap-4">
            {events.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {events.map((e) => {
                  const { ymd, time } = seoulParts(e.startsAt);
                  return (
                    <EventItem
                      key={e.id}
                      entry={{ kind: e.kind, title: e.title, ymd, time: e.allDay ? null : time, memo: e.memo, done: e.done }}
                      today={today}
                      updateAction={updateEvent.bind(null, app.id, e.id)}
                      toggleDoneAction={setEventDone.bind(null, app.id, e.id, !e.done)}
                      deleteAction={deleteEvent.bind(null, app.id, e.id)}
                      askAdvanceFrom={
                        e.kind === "interview" && !e.done && isBeforeInterview(app.status) ? STATUS_LABEL[app.status] : undefined
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">등록된 일정이 없습니다.</p>
            )}
            <EventAddForm action={createEvent.bind(null, app.id)} today={today} />
          </div>
        </div>
      </div>

      <div className={`${cardClass} divide-y divide-zinc-200 dark:divide-zinc-800`}>
        <div className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold">상태 변경</h2>
          <StatusChangeForm action={changeStatus.bind(null, app.id)} currentStatus={app.status} today={today} />
        </div>
        <div className="p-5 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold">상태 이력</h2>
          <p className="mb-4 text-xs text-zinc-500">변경일·메모는 수정할 수 있고, 가장 최근 변경은 삭제해서 이전 상태로 되돌릴 수 있습니다.</p>
          <ol className="flex flex-col gap-4 border-l border-zinc-200 pl-4 dark:border-zinc-800">
            {history.map((h) => (
              <HistoryItem
                key={h.id}
                entry={{
                  fromStatus: h.fromStatus,
                  toStatus: h.toStatus,
                  changedOn: h.changedOn,
                  note: h.note,
                  recordedAt: formatDateTime(h.changedAt),
                }}
                today={today}
                updateAction={updateHistory.bind(null, app.id, h.id)}
                deleteAction={h.id === latestId ? deleteHistory.bind(null, app.id, h.id) : undefined}
              />
            ))}
          </ol>
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        등록 {formatDateTime(app.createdAt)} · 마지막 수정 {formatDateTime(app.updatedAt)}
      </p>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
