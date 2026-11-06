"use client";

// 일정 추가·수정 폼. 추가는 "+ 일정 추가" 버튼으로 펼친다.
import { useActionState, useId, useState } from "react";
import type { EventKind } from "@/db/schema";
import type { EventField, EventFormState } from "@/lib/event-input";
import { EVENT_KIND_LABEL, EVENT_KIND_ORDER } from "@/lib/labels";
import { DatePicker } from "./date-picker";
import { Field } from "./field";
import { Select } from "./select";
import { SuggestInput } from "./suggest-input";
import { useFieldErrors } from "./use-field-errors";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./ui";

export type EventValues = Partial<Record<EventField, string>>;
type Action = (prev: EventFormState, formData: FormData) => Promise<EventFormState>;

const KIND_OPTIONS = EVENT_KIND_ORDER.map((k) => ({ value: k, label: EVENT_KIND_LABEL[k] }));

// 09:00~21:00 30분 간격 + 하루 끝 마감
const TIME_SUGGESTIONS = [
  ...Array.from({ length: 25 }, (_, i) => {
    const minutes = 9 * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }),
  "23:59",
];

type FormProps = {
  action: Action;
  initial: EventValues;
  today: string;
  submitLabel: string;
  /** 저장에 성공했을 때 */
  onSaved: () => void;
  onCancel: () => void;
};

export function EventForm({ action, initial, today, submitLabel, onSaved, onCancel }: FormProps) {
  const [state, formAction, pending] = useActionState(async (prev: EventFormState, fd: FormData) => {
    const next = await action(prev, fd);
    if (next.savedAt) onSaved();
    return next;
  }, {});
  const values = state.values ?? initial;
  // 실패하면 React가 폼을 초기화하므로, 돌려받은 입력값으로 다시 그린다
  return (
    <EventFormBody
      key={JSON.stringify(values)}
      values={values}
      state={state}
      formAction={formAction}
      pending={pending}
      today={today}
      submitLabel={submitLabel}
      onCancel={onCancel}
    />
  );
}

function EventFormBody({
  values,
  state,
  formAction,
  pending,
  today,
  submitLabel,
  onCancel,
}: {
  values: EventValues;
  state: EventFormState;
  formAction: (fd: FormData) => void;
  pending: boolean;
  today: string;
  submitLabel: string;
  onCancel: () => void;
}) {
  const { errors, clear, onInput } = useFieldErrors(state.errors);
  const [kind, setKind] = useState(values.kind ?? "interview");
  const id = useId(); // 한 화면에 폼이 여러 개 열려도 id가 겹치지 않도록
  const fid = (name: string) => `${id}-${name}`;

  return (
    <form action={formAction} onInput={onInput} className="flex flex-col gap-1 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
      {state.message && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr]">
        <Field htmlFor={fid("kind")} label="종류" error={errors.kind}>
          <Select id={fid("kind")} name="kind" options={KIND_OPTIONS} value={kind}
            onValueChange={(v) => { setKind(v); clear("kind"); }} invalid={!!errors.kind} />
        </Field>
        <Field htmlFor={fid("title")} label="제목" error={errors.title}>
          <input id={fid("title")} name="title" defaultValue={values.title} maxLength={100}
            placeholder={`예: 1차 면접 · 비우면 '${EVENT_KIND_LABEL[kind as EventKind] ?? "기타"}'`}
            aria-invalid={!!errors.title} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field htmlFor={fid("date")} label="날짜" required error={errors.date}>
          <DatePicker id={fid("date")} name="date" defaultValue={values.date ?? today} today={today}
            onChange={() => clear("date")} invalid={!!errors.date} />
        </Field>
        <Field htmlFor={fid("time")} label="시간" error={errors.time} hint="비우면 시간 미정">
          <SuggestInput id={fid("time")} name="time" defaultValue={values.time} suggestions={TIME_SUGGESTIONS}
            placeholder="예: 14:00" maxLength={5} invalid={!!errors.time} />
        </Field>
        <Field htmlFor={fid("memo")} label="메모" error={errors.memo} className="sm:col-span-2">
          <input id={fid("memo")} name="memo" defaultValue={values.memo} maxLength={1000}
            placeholder="선택 · 예: 화상 면접, 링크는 메일 참고" aria-invalid={!!errors.memo} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          취소
        </button>
        <button type="submit" disabled={pending} className={`${primaryButtonClass} min-w-20`}>
          {pending ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** "+ 일정 추가" 버튼 → 추가 폼. 저장하면 닫힌다. */
export function EventAddForm({ action, today }: { action: Action; today: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${secondaryButtonClass} self-start`}>
        + 일정 추가
      </button>
    );
  }
  return (
    <EventForm action={action} initial={{}} today={today} submitLabel="추가"
      onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
  );
}
