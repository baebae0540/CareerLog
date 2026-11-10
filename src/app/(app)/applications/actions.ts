"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { applicationImages, applications, events } from "@/db/schema";
import { inAccount, ownApplication } from "@/db/scope";
import {
  changeStatusWithHistory,
  deleteLatestHistoryEntry,
  insertApplicationWithHistory,
  updateHistoryEntry,
} from "@/db/statements";
import {
  isBeforeInterview,
  parseCreateForm,
  parseHistoryEditForm,
  parseStatusChangeForm,
  parseUpdateForm,
  type ApplicationFormState,
  type StatusChangeFormState,
} from "@/lib/application-input";
import { seoulParts, todayInSeoul } from "@/lib/dates";
import { parseEventForm, type EventFormState } from "@/lib/event-input";
import {
  detectImageType,
  formatBytes,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_APPLICATION,
  parseDimension,
} from "@/lib/image-input";
import { requireLogin } from "@/lib/session";

/** 상태 변경. 상태는 이 액션으로만 바꾼다 (이력 기록이 한 곳에 있도록, AGENTS.md 규칙). */
export async function changeStatus(
  id: number,
  _prev: StatusChangeFormState,
  formData: FormData,
): Promise<StatusChangeFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseStatusChangeForm(formData);
  if (!parsed.ok) return parsed.state;

  const result = await getDb().execute(changeStatusWithHistory(accountId, id, parsed.data));
  if (result.rows.length === 0) {
    return { message: "이미 같은 상태이거나 삭제된 지원 건입니다." };
  }

  revalidatePath("/");
  revalidatePath(`/applications/${id}`);
  return { savedAt: Date.now() };
}

export async function createApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseCreateForm(formData);
  if (!parsed.ok) return parsed.state;

  // 지원 건 저장 + 첫 상태 이력을 SQL 한 문장으로 (둘 중 하나만 저장되는 일 방지)
  const result = await getDb().execute(insertApplicationWithHistory(accountId, parsed.data, todayInSeoul()));
  const id = Number(result.rows[0].id);

  revalidatePath("/");
  redirect(`/applications/${id}`);
}

/** 상태 이력의 변경일·메모 수정 */
export async function updateHistory(
  applicationId: number,
  historyId: number,
  _prev: StatusChangeFormState,
  formData: FormData,
): Promise<StatusChangeFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseHistoryEditForm(formData);
  if (!parsed.ok) return parsed.state;

  const result = await getDb().execute(updateHistoryEntry(accountId, applicationId, historyId, parsed.data));
  if (result.rows.length === 0) return { message: "이미 삭제된 이력입니다." };

  revalidatePath("/");
  revalidatePath(`/applications/${applicationId}`);
  return { savedAt: Date.now() };
}

/** 가장 최근 상태 변경 삭제 (= 이전 상태로 되돌리기) */
export async function deleteHistory(applicationId: number, historyId: number) {
  const { accountId } = await requireLogin();
  // 최근 변경이 아니거나 첫 등록 이력이면 SQL에서 아무것도 지우지 않는다
  await getDb().execute(deleteLatestHistoryEntry(accountId, applicationId, historyId));
  revalidatePath("/");
  revalidatePath(`/applications/${applicationId}`);
}

export async function updateApplication(
  id: number,
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseUpdateForm(formData);
  if (!parsed.ok) return parsed.state;

  const updated = await getDb()
    .update(applications)
    .set(parsed.data)
    .where(ownApplication(accountId, id))
    .returning({ id: applications.id });
  if (updated.length === 0) {
    return { message: "이미 삭제된 지원 건입니다." };
  }

  revalidatePath("/");
  revalidatePath(`/applications/${id}`);
  redirect(`/applications/${id}`);
}

export async function deleteApplication(id: number) {
  const { accountId } = await requireLogin();
  // 상태 이력·일정·사진은 FK cascade로 함께 지워진다
  await getDb().delete(applications).where(ownApplication(accountId, id));
  revalidatePath("/");
  redirect("/");
}

// ── 일정 ──────────────────────────────────────────────

function revalidateApplication(applicationId: number) {
  revalidatePath("/");
  revalidatePath(`/applications/${applicationId}`);
}

const eventOf = (accountId: number, applicationId: number, eventId: number) =>
  and(eq(events.id, eventId), eq(events.applicationId, applicationId), inAccount(accountId, events.applicationId));

export async function createEvent(
  applicationId: number,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed.state;

  const [app] = await getDb()
    .select({ id: applications.id })
    .from(applications)
    .where(ownApplication(accountId, applicationId));
  if (!app) return { message: "이미 삭제된 지원 건입니다." };

  await getDb().insert(events).values({ applicationId, ...parsed.data });
  revalidateApplication(applicationId);
  return { savedAt: Date.now() };
}

export async function updateEvent(
  applicationId: number,
  eventId: number,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { accountId } = await requireLogin();
  const parsed = parseEventForm(formData);
  if (!parsed.ok) return parsed.state;

  const updated = await getDb()
    .update(events)
    .set(parsed.data)
    .where(eventOf(accountId, applicationId, eventId))
    .returning({ id: events.id });
  if (updated.length === 0) return { message: "이미 삭제된 일정입니다." };

  revalidateApplication(applicationId);
  return { savedAt: Date.now() };
}

/**
 * 일정 완료 표시/취소.
 * 면접 일정을 완료하면서 advanceStatus=1이면(화면에서 확인함) 상태를 '면접'으로 바꾼다.
 * 상태 변경 SQL은 changeStatus와 같은 changeStatusWithHistory를 쓴다 (이력 기록은 한 곳).
 */
export async function setEventDone(applicationId: number, eventId: number, done: boolean, formData: FormData) {
  const { accountId } = await requireLogin();
  const db = getDb();
  const markDone = db.update(events).set({ done }).where(eventOf(accountId, applicationId, eventId));

  if (done && formData.get("advanceStatus") === "1") {
    // 화면 값만 믿지 않고 서버에서 다시 확인: 면접 일정이고 지원 건이 면접 이전 단계일 때만
    const [row] = await db
      .select({ kind: events.kind, title: events.title, startsAt: events.startsAt, status: applications.status })
      .from(events)
      .innerJoin(applications, eq(applications.id, events.applicationId))
      .where(eventOf(accountId, applicationId, eventId));
    if (row && row.kind === "interview" && isBeforeInterview(row.status)) {
      const change = changeStatusWithHistory(accountId, applicationId, {
        toStatus: "interview",
        changedOn: seoulParts(row.startsAt).ymd, // 일정 날짜
        note: `${row.title} 완료`,
      });
      // 완료 표시와 상태 변경을 한 트랜잭션으로
      await db.batch([markDone, db.execute(change)]);
      revalidateApplication(applicationId);
      return;
    }
  }

  await markDone;
  revalidateApplication(applicationId);
}

export async function deleteEvent(applicationId: number, eventId: number) {
  const { accountId } = await requireLogin();
  await getDb().delete(events).where(eventOf(accountId, applicationId, eventId));
  revalidateApplication(applicationId);
}

// ── 사진 ──────────────────────────────────────────────

export type ImageUploadState = { message?: string; savedAt?: number };

/**
 * 사진 올리기. formData: file(여러 개), 같은 순서의 width·height.
 * 브라우저에서 이미 줄여서 보내지만 크기·형식은 여기서 다시 확인한다.
 */
export async function uploadImages(
  applicationId: number,
  _prev: ImageUploadState,
  formData: FormData,
): Promise<ImageUploadState> {
  const { accountId } = await requireLogin();
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { message: "올릴 사진을 골라 주세요." };
  const widths = formData.getAll("width");
  const heights = formData.getAll("height");

  const db = getDb();
  const [app] = await db.select({ id: applications.id }).from(applications).where(ownApplication(accountId, applicationId));
  if (!app) return { message: "이미 삭제된 지원 건입니다." };

  const [{ total }] = await db
    .select({ total: count() })
    .from(applicationImages)
    .where(eq(applicationImages.applicationId, applicationId));
  if (total + files.length > MAX_IMAGES_PER_APPLICATION) {
    return { message: `사진은 지원 건마다 ${MAX_IMAGES_PER_APPLICATION}장까지 올릴 수 있습니다 (지금 ${total}장).` };
  }

  const rows = [];
  for (const [i, file] of files.entries()) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { message: `사진이 너무 큽니다: ${file.name} (${formatBytes(file.size)}, 최대 ${formatBytes(MAX_IMAGE_BYTES)})` };
    }
    const data = Buffer.from(await file.arrayBuffer());
    const mime = detectImageType(data);
    if (!mime) return { message: `PNG·JPG·WebP·GIF 사진만 올릴 수 있습니다: ${file.name}` };
    rows.push({
      applicationId,
      mime,
      data,
      size: data.length,
      width: parseDimension(widths[i] ?? null),
      height: parseDimension(heights[i] ?? null),
    });
  }

  await db.insert(applicationImages).values(rows);
  revalidatePath(`/applications/${applicationId}`);
  return { savedAt: Date.now() };
}

export async function deleteImage(applicationId: number, imageId: number) {
  const { accountId } = await requireLogin();
  await getDb()
    .delete(applicationImages)
    .where(
      and(
        eq(applicationImages.id, imageId),
        eq(applicationImages.applicationId, applicationId),
        inAccount(accountId, applicationImages.applicationId),
      ),
    );
  revalidatePath(`/applications/${applicationId}`);
}
