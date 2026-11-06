"use client";

import { useActionState } from "react";
import type { ApplicationStatus } from "@/db/schema";
import type { StatusChangeFormState } from "@/lib/application-input";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { DatePicker } from "./date-picker";
import { Field } from "./field";
import { Select } from "./select";
import { inputClass, primaryButtonClass } from "./ui";

type Props = {
  action: (prev: StatusChangeFormState, formData: FormData) => Promise<StatusChangeFormState>;
  currentStatus: ApplicationStatus;
  today: string;
};

/** 다음 단계를 기본으로 고른다 (결과 상태면 그대로 첫 후보) */
function suggestNext(current: ApplicationStatus): ApplicationStatus {
  const flow: ApplicationStatus[] = ["interested", "applied", "document_passed", "interview", "final", "offer"];
  const i = flow.indexOf(current);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : STATUS_ORDER.find((s) => s !== current)!;
}

export function StatusChangeForm({ action, currentStatus, today }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};
  const options = STATUS_ORDER.filter((s) => s !== currentStatus).map((s) => ({ value: s, label: STATUS_LABEL[s] }));

  return (
    // 성공하면(savedAt 변경) 새 현재 상태 기준으로 폼을 다시 그린다
    <form key={`${currentStatus}-${state.savedAt ?? 0}`} action={formAction} className="flex flex-col gap-1">
      {state.message && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <Field htmlFor="toStatus" label="바꿀 상태" error={errors.toStatus}>
          <Select id="toStatus" name="toStatus" options={options} defaultValue={suggestNext(currentStatus)} invalid={!!errors.toStatus} />
        </Field>
        <Field htmlFor="changedOn" label="변경일" error={errors.changedOn}>
          <DatePicker id="changedOn" name="changedOn" defaultValue={today} today={today} invalid={!!errors.changedOn} />
        </Field>
        <Field htmlFor="note" label="메모" error={errors.note} className="sm:col-span-2">
          <input id="note" name="note" maxLength={1000} placeholder="선택 · 예: 1차 면접 합격 연락"
            aria-invalid={!!errors.note} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className={`${primaryButtonClass} min-w-24`}>
          {pending ? "저장 중…" : "상태 변경"}
        </button>
      </div>
    </form>
  );
}
