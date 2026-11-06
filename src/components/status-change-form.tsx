"use client";

import { useActionState } from "react";
import type { ApplicationStatus } from "@/db/schema";
import type { StatusChangeFormState } from "@/lib/application-input";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
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

  return (
    // 성공하면(savedAt 변경) 새 현재 상태 기준으로 폼을 다시 그린다
    <form key={`${currentStatus}-${state.savedAt ?? 0}`} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          바꿀 상태
          <select name="toStatus" defaultValue={suggestNext(currentStatus)} className={inputClass}>
            {STATUS_ORDER.filter((s) => s !== currentStatus).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          변경일
          <input name="changedOn" type="date" defaultValue={today} required
            aria-invalid={!!errors.changedOn} className={inputClass} />
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "저장 중…" : "상태 변경"}
        </button>
      </div>
      <input name="note" maxLength={1000} placeholder="메모 (선택) 예: 1차 면접 합격 연락"
        aria-invalid={!!errors.note} className={inputClass} />
      {(state.message || errors.toStatus || errors.changedOn || errors.note) && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message ?? errors.toStatus ?? errors.changedOn ?? errors.note}
        </p>
      )}
    </form>
  );
}
