"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ApplicationStatus } from "@/db/schema";
import type { StatusChangeFormState } from "@/lib/application-input";
import { formatYmd } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/labels";
import { DatePicker } from "./date-picker";
import { inputClass, linkButtonClass, primaryButtonClass, secondaryButtonClass } from "./ui";

type Entry = {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedOn: string;
  note: string | null;
  /** 기록 시각 (표시용 문자열) */
  recordedAt: string;
};

type Props = {
  entry: Entry;
  today: string;
  updateAction: (prev: StatusChangeFormState, formData: FormData) => Promise<StatusChangeFormState>;
  /** 가장 최근 변경일 때만 (삭제 = 이전 상태로 되돌리기) */
  deleteAction?: () => Promise<void>;
};

export function HistoryItem({ entry, today, updateAction, deleteAction }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-950" />
      {editing ? (
        <EditForm entry={entry} today={today} action={updateAction} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm">
              {entry.fromStatus ? (
                <>
                  <span className="text-zinc-500">{STATUS_LABEL[entry.fromStatus]} →</span>{" "}
                  <strong>{STATUS_LABEL[entry.toStatus]}</strong>
                </>
              ) : (
                <>
                  <strong>{STATUS_LABEL[entry.toStatus]}</strong> 상태로 등록
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500" title={`기록: ${entry.recordedAt}`}>
              {formatYmd(entry.changedOn)}
            </p>
            {entry.note && (
              <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{entry.note}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 pt-0.5">
            <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
              수정
            </button>
            {deleteAction && entry.fromStatus && (
              <form
                action={deleteAction}
                onSubmit={(e) => {
                  const msg = `이 변경을 삭제하고 '${STATUS_LABEL[entry.fromStatus!]}' 상태로 되돌릴까요?`;
                  if (!confirm(msg)) e.preventDefault();
                }}
              >
                <DeleteButton />
              </form>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${linkButtonClass} hover:text-red-600 dark:hover:text-red-400`}>
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}

function EditForm({
  entry,
  today,
  action,
  onDone,
}: {
  entry: Entry;
  today: string;
  action: Props["updateAction"];
  onDone: () => void;
}) {
  // 저장에 성공하면 편집을 닫는다
  const [state, formAction, pending] = useActionState(async (prev: StatusChangeFormState, fd: FormData) => {
    const next = await action(prev, fd);
    if (next.savedAt) onDone();
    return next;
  }, {});
  const error = state.message ?? state.errors?.changedOn ?? state.errors?.note;

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-sm font-medium">
        {entry.fromStatus ? `${STATUS_LABEL[entry.fromStatus]} → ` : ""}
        {STATUS_LABEL[entry.toStatus]}
        {!entry.fromStatus && " 상태로 등록"}
      </p>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <DatePicker name="changedOn" defaultValue={entry.changedOn} today={today} invalid={!!state.errors?.changedOn} />
        <input name="note" defaultValue={entry.note ?? ""} maxLength={1000} placeholder="메모 (선택)" className={inputClass} />
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          취소
        </button>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
