"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ApplicationFormState, FormField } from "@/lib/application-input";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/labels";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "./ui";

type Props = {
  action: (prev: ApplicationFormState, formData: FormData) => Promise<ApplicationFormState>;
  /** 처음 채울 값 (수정 화면에서는 기존 값, 등록 화면에서는 기본값) */
  initial: Partial<Record<FormField, string>>;
  /** 등록일 때만 상태를 고른다. 수정 화면에서는 상태를 바꾸지 않는다. */
  withStatus: boolean;
  submitLabel: string;
  cancelHref: string;
};

export function ApplicationForm({ action, initial, withStatus, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // 검증 실패로 돌아오면 사용자가 입력했던 값으로 다시 채운다
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  return (
    // key: 실패 응답이 올 때마다 defaultValue를 새 값으로 다시 적용
    <form key={JSON.stringify(values)} action={formAction} className="flex flex-col gap-5" noValidate>
      {state.message && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="company" label="회사" required error={errors.company}>
          <input id="company" name="company" defaultValue={values.company} maxLength={100}
            aria-invalid={!!errors.company} className={inputClass} autoFocus />
        </Field>
        <Field name="position" label="포지션" required error={errors.position}>
          <input id="position" name="position" defaultValue={values.position} maxLength={100}
            aria-invalid={!!errors.position} className={inputClass} placeholder="예: 백엔드 개발자" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {withStatus && (
          <Field name="status" label="현재 상태" required error={errors.status}>
            <select id="status" name="status" defaultValue={values.status} className={inputClass}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>
        )}
        <Field name="appliedAt" label="지원일" error={errors.appliedAt} hint="아직 지원 전이면 비워 두세요">
          <input id="appliedAt" name="appliedAt" type="date" defaultValue={values.appliedAt}
            aria-invalid={!!errors.appliedAt} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="jobUrl" label="공고 링크" error={errors.jobUrl}>
          <input id="jobUrl" name="jobUrl" type="url" inputMode="url" defaultValue={values.jobUrl}
            aria-invalid={!!errors.jobUrl} className={inputClass} placeholder="https://" />
        </Field>
        <Field name="source" label="지원 경로" error={errors.source}>
          <input id="source" name="source" defaultValue={values.source} maxLength={50}
            aria-invalid={!!errors.source} className={inputClass} placeholder="예: 원티드, 지인 추천" list="source-options" />
          <datalist id="source-options">
            {["원티드", "사람인", "잡코리아", "링크드인", "리멤버", "회사 홈페이지", "지인 추천", "헤드헌터"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field name="memo" label="메모" error={errors.memo}>
        <textarea id="memo" name="memo" defaultValue={values.memo} rows={6} maxLength={5000}
          aria-invalid={!!errors.memo} className={inputClass} placeholder="회사 정보, 연봉 조건, 준비할 것 등" />
      </Field>

      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className={secondaryButtonClass}>취소</Link>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  error,
  hint,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}
