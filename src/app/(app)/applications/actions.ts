"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { insertApplicationWithHistory } from "@/db/statements";
import {
  parseCreateForm,
  parseUpdateForm,
  type ApplicationFormState,
} from "@/lib/application-input";
import { requireLogin } from "@/lib/session";

export async function createApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireLogin();
  const parsed = parseCreateForm(formData);
  if (!parsed.ok) return parsed.state;

  // 지원 건 저장 + 첫 상태 이력을 SQL 한 문장으로 (둘 중 하나만 저장되는 일 방지)
  const result = await getDb().execute(insertApplicationWithHistory(parsed.data));
  const id = Number(result.rows[0].id);

  revalidatePath("/");
  redirect(`/applications/${id}`);
}

export async function updateApplication(
  id: number,
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  await requireLogin();
  const parsed = parseUpdateForm(formData);
  if (!parsed.ok) return parsed.state;

  const updated = await getDb()
    .update(applications)
    .set(parsed.data)
    .where(eq(applications.id, id))
    .returning({ id: applications.id });
  if (updated.length === 0) {
    return { message: "이미 삭제된 지원 건입니다." };
  }

  revalidatePath("/");
  revalidatePath(`/applications/${id}`);
  redirect(`/applications/${id}`);
}

export async function deleteApplication(id: number) {
  await requireLogin();
  // 상태 이력·일정은 FK cascade로 함께 지워진다
  await getDb().delete(applications).where(eq(applications.id, id));
  revalidatePath("/");
  redirect("/");
}
