// 일정 입력 폼 검증. 서버 액션에서 쓰고, 순수 함수라 테스트한다.
import { z } from "zod";
import { eventKind } from "@/db/schema";
import { optionalText } from "@/lib/application-input";
import { isValidYmd, seoulDateTime } from "@/lib/dates";
import { EVENT_KIND_LABEL } from "@/lib/labels";

/**
 * 시간 입력을 "HH:MM"으로. "14:00", "9:30", "1400", "930" 등을 받는다.
 * 빈 값은 null(시간 미정), 알아볼 수 없으면 undefined.
 */
export function normalizeTime(input: string): string | null | undefined {
  const v = input.trim();
  if (v === "") return null;
  const m = /^(\d{1,2}):?(\d{2})$/.exec(v);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export const EVENT_FIELDS = ["kind", "title", "date", "time", "memo"] as const;
export type EventField = (typeof EVENT_FIELDS)[number];

const eventSchema = z
  .object({
    kind: z.enum(eventKind.enumValues, { error: "종류를 선택하세요" }),
    title: optionalText(100, "제목"),
    date: z.string().refine(isValidYmd, "올바른 날짜를 입력하세요"),
    time: z
      .string()
      .transform(normalizeTime)
      .refine((v) => v !== undefined, "14:00처럼 입력하세요"),
    memo: optionalText(1000, "메모"),
  })
  .transform((v) => ({
    kind: v.kind,
    // 제목을 비우면 종류 이름으로
    title: v.title ?? EVENT_KIND_LABEL[v.kind],
    startsAt: seoulDateTime(v.date, v.time ?? undefined),
    allDay: v.time === null,
    memo: v.memo,
  }));

export type EventInput = z.infer<typeof eventSchema>;

/** 실패하면 필드별 오류와 입력값을 돌려줘서 다시 채운다 */
export type EventFormState = {
  errors?: Partial<Record<EventField, string>>;
  values?: Partial<Record<EventField, string>>;
  message?: string;
  /** 성공할 때마다 바뀌어 폼을 초기화하는 데 쓴다 */
  savedAt?: number;
};

export function parseEventForm(
  formData: FormData,
): { ok: true; data: EventInput } | { ok: false; state: EventFormState } {
  const values: Partial<Record<EventField, string>> = {};
  for (const key of EVENT_FIELDS) {
    const v = formData.get(key);
    values[key] = typeof v === "string" ? v : "";
  }
  const result = eventSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: Partial<Record<EventField, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as EventField;
    errors[key] ??= issue.message;
  }
  return { ok: false, state: { errors, values } };
}
