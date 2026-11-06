// 지원 건 입력 폼 검증. 서버 액션에서 쓰고, 순수 함수라 테스트한다.
import { z } from "zod";
import { applicationStatus, type ApplicationStatus } from "@/db/schema";
import { isValidYmd } from "@/lib/dates";

/** 받침이 있으면 a, 없으면 b (한글이 아니면 b) */
function josa(word: string, a: string, b: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? a : b;
}
const tooLong = (label: string, max: number) => `${label}${josa(label, "은", "는")} ${max}자 이하로 입력하세요`;

/** 빈 문자열은 null로 바꾸는 선택 입력 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong(label, max))
    .transform((v) => (v === "" ? null : v));

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label}${josa(label, "을", "를")} 입력하세요`)
    .max(max, tooLong(label, max));

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

const statusField = z.enum(applicationStatus.enumValues, { error: "상태를 선택하세요" });

const createSchema = fieldsSchema
  .extend({ status: statusField })
  // 관심 = 지원 전. 지원일이 들어 있어도 저장하지 않는다.
  .transform((v) => (v.status === "interested" ? { ...v, appliedAt: null } : v));

export type ApplicationFields = z.infer<typeof fieldsSchema>;
export type ApplicationCreateInput = z.infer<typeof createSchema>;

/** 관심 상태는 지원일과 상관없이 '지원 전'이다 */
export function isBeforeApplying(status: ApplicationStatus) {
  return status === "interested";
}

const statusChangeSchema = z.object({
  toStatus: statusField,
  changedOn: z.string().refine(isValidYmd, "올바른 날짜를 입력하세요"),
  note: optionalText(1000, "메모"),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export type StatusChangeFormState = {
  errors?: Partial<Record<keyof StatusChangeInput, string>>;
  message?: string;
  /** 성공할 때마다 바뀌어 폼을 초기화하는 데 쓴다 */
  savedAt?: number;
};

const historyEditSchema = statusChangeSchema.pick({ changedOn: true, note: true });
export type HistoryEditInput = z.infer<typeof historyEditSchema>;

/** 상태 이력 수정 폼 (변경일·메모만. 상태 값은 흐름이 깨지므로 바꾸지 않는다) */
export function parseHistoryEditForm(
  formData: FormData,
): { ok: true; data: HistoryEditInput } | { ok: false; state: StatusChangeFormState } {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const result = historyEditSchema.safeParse({ changedOn: get("changedOn"), note: get("note") });
  if (result.success) return { ok: true, data: result.data };
  const errors: StatusChangeFormState["errors"] = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof StatusChangeInput;
    errors[key] ??= issue.message;
  }
  return { ok: false, state: { errors } };
}

/** 상태 변경 폼 */
export function parseStatusChangeForm(
  formData: FormData,
): { ok: true; data: StatusChangeInput } | { ok: false; state: StatusChangeFormState } {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const result = statusChangeSchema.safeParse({
    toStatus: get("toStatus"),
    changedOn: get("changedOn"),
    note: get("note"),
  });
  if (result.success) return { ok: true, data: result.data };
  const errors: StatusChangeFormState["errors"] = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof StatusChangeInput;
    errors[key] ??= issue.message;
  }
  return { ok: false, state: { errors } };
}

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

function parse<T>(schema: z.ZodType<T, unknown>, formData: FormData): ParseResult<T> {
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
