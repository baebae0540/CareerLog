import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplication, getStatusHistory } from "@/db/queries";
import { DeleteForm } from "@/components/delete-button";
import { StatusBadge } from "@/components/status-badge";
import { StatusChangeForm } from "@/components/status-change-form";
import { cardClass, secondaryButtonClass } from "@/components/ui";
import { isBeforeApplying, parseId } from "@/lib/application-input";
import { formatDateTime, formatYmd, todayInSeoul } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/labels";
import { requireLogin } from "@/lib/session";
import { changeStatus, deleteApplication } from "../actions";

export default async function ApplicationDetailPage(props: PageProps<"/applications/[id]">) {
  await requireLogin();
  const id = parseId((await props.params).id);
  if (!id) notFound();

  const [app, history] = await Promise.all([getApplication(id), getStatusHistory(id)]);
  if (!app) notFound();

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

      <dl className={`${cardClass} grid gap-x-6 gap-y-4 p-5 sm:grid-cols-3`}>
        <Item label="지원일">{app.appliedAt && !isBeforeApplying(app.status) ? formatYmd(app.appliedAt) : "지원 전"}</Item>
        <Item label="지원 경로">{app.source ?? "-"}</Item>
        <Item label="공고 링크">
          {app.jobUrl ? (
            <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline dark:text-blue-400">
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

      <div className={`${cardClass} p-5`}>
        <h2 className="mb-4 font-semibold">상태 변경</h2>
        <StatusChangeForm action={changeStatus.bind(null, app.id)} currentStatus={app.status} today={todayInSeoul()} />
      </div>

      <div className={`${cardClass} p-5`}>
        <h2 className="mb-4 font-semibold">상태 이력</h2>
        <ol className="flex flex-col gap-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          {history.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-blue-500" />
              <p className="text-sm">
                {h.fromStatus ? (
                  <>
                    {STATUS_LABEL[h.fromStatus]} → <strong>{STATUS_LABEL[h.toStatus]}</strong>
                  </>
                ) : (
                  <>
                    <strong>{STATUS_LABEL[h.toStatus]}</strong> 상태로 등록
                  </>
                )}
              </p>
              <p className="text-xs text-zinc-500" title={`기록: ${formatDateTime(h.changedAt)}`}>
                {formatYmd(h.changedOn)}
              </p>
              {h.note && <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{h.note}</p>}
            </li>
          ))}
        </ol>
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
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
