"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { EventKind } from "@/db/schema";
import type { EventFormState } from "@/lib/event-input";
import { dDayLabel, formatYmd } from "@/lib/dates";
import { EVENT_KIND_BADGE_CLASS, EVENT_KIND_LABEL } from "@/lib/labels";
import { EventForm } from "./event-form";
import { linkButtonClass } from "./ui";

export type EventEntry = {
  kind: EventKind;
  title: string;
  /** 한국 날짜 YYYY-MM-DD */
  ymd: string;
  /** HH:MM, 시간 미정이면 null */
  time: string | null;
  memo: string | null;
  done: boolean;
};

type Props = {
  entry: EventEntry;
  today: string;
  updateAction: (prev: EventFormState, formData: FormData) => Promise<EventFormState>;
  toggleDoneAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
};

export function EventItem({ entry, today, updateAction, toggleDoneAction, deleteAction }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <EventForm
          action={updateAction}
          initial={{ kind: entry.kind, title: entry.title, date: entry.ymd, time: entry.time ?? "", memo: entry.memo ?? "" }}
          today={today}
          submitLabel="저장"
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const past = entry.ymd < today;
  const dDay = dDayLabel(today, entry.ymd);

  return (
    <li className="flex items-start gap-3">
      <form action={toggleDoneAction} className="pt-0.5">
        <DoneButton done={entry.done} />
      </form>
      <div className={`min-w-0 flex-1 ${entry.done || past ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${EVENT_KIND_BADGE_CLASS[entry.kind]}`}>
            {EVENT_KIND_LABEL[entry.kind]}
          </span>
          <span className={`text-sm font-medium ${entry.done ? "line-through" : ""}`}>{entry.title}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {formatYmd(entry.ymd)} {entry.time ?? "· 시간 미정"}
          {!entry.done && dDay !== "지남" && (
            <span className={`ml-2 font-medium ${dDay === "오늘" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
              {dDay}
            </span>
          )}
        </p>
        {entry.memo && <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{entry.memo}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-0.5">
        <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>
          수정
        </button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (!confirm(`'${entry.title}' 일정을 삭제할까요?`)) e.preventDefault();
          }}
        >
          <DeleteButton />
        </form>
      </div>
    </li>
  );
}

function DoneButton({ done }: { done: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={done}
      title={done ? "완료 취소" : "완료로 표시"}
      className={`flex size-5 items-center justify-center rounded border transition-colors disabled:opacity-60 ${
        done
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-zinc-300 bg-white hover:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <span className="sr-only">{done ? "완료 취소" : "완료로 표시"}</span>
      {done && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
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
