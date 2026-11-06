// 지원 건 입력 폼 검증. 서버 액션에서 쓰고, 순수 함수라 테스트한다.
import { z } from "zod";
import { applicationStatus } from "@/db/schema";
import { isValidYmd } from "@/lib/dates";

/** 빈 문자열은 null로 바꾸는 선택 입력 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자 이하로 입력하세요`)
    .transform((v) => (v === "" ? null : v));

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label}을(를) 입력하세요`)
    .max(max, `${label}은(는) ${max}자 이하로 입력하세요`);

const fieldsSchema = z.object({
  company: requiredText(100, "회사"),
  position: requiredText(100, "포지션"),
  // http(s)만 허용: javascript: 같은 링크가 화면에 걸리지 않도록
  jobUrl: optionalText(2000, "공고 링크").refine(
    (v) => v === null || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    "http:// 또는 https://로 시작하는 주소를 입력하세요",
  ),
  source: optionalText(50, "지원 경로"),
  appliedAt: optionalText(10, "지원일").refine(
    (v) => v === null || isValidYmd(v),
    "올바른 날짜를 입력하세요",
  ),
  memo: optionalText(5000, "메모"),
});

const createSchema = fieldsSchema.extend({
  status: z.enum(applicationStatus.enumValues, { error: "상태를 선택하세요" }),
});

export type ApplicationFields = z.infer<typeof fieldsSchema>;
export type ApplicationCreateInput = z.infer<typeof createSchema>;

export const FORM_FIELDS = [
  "company",
  "position",
  "jobUrl",
  "source",
  "appliedAt",
  "memo",
  "status",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];

/** 폼 상태: 실패하면 필드별 오류와 입력값을 돌려줘서 다시 채운다 */
export type ApplicationFormState = {
  errors?: Partial<Record<FormField, string>>;
  values?: Partial<Record<FormField, string>>;
  message?: string;
};

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; state: ApplicationFormState };

function readForm(formData: FormData) {
  const values: Partial<Record<FormField, string>> = {};
  for (const key of FORM_FIELDS) {
    const v = formData.get(key);
    values[key] = typeof v === "string" ? v : "";
  }
  return values;
}

function parse<T>(schema: z.ZodType<T>, formData: FormData): ParseResult<T> {
  const values = readForm(formData);
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const errors: Partial<Record<FormField, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as FormField;
    errors[key] ??= issue.message; // 필드마다 첫 오류만
  }
  return { ok: false, state: { errors, values } };
}

/** 등록 폼 (상태 포함) */
export function parseCreateForm(formData: FormData) {
  return parse(createSchema, formData);
}

/** 수정 폼 (상태 제외: 상태는 changeStatus로만 바꾼다) */
export function parseUpdateForm(formData: FormData) {
  return parse(fieldsSchema, formData);
}

/** URL의 id 문자열 → 양의 정수. 아니면 null */
export function parseId(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}
