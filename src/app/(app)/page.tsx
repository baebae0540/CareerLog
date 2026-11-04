import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { requireLogin } from "@/lib/session";

export default async function HomePage() {
  await requireLogin();

  // 0단계: DB 연결 확인용. 1단계에서 지원 목록으로 바꾼다.
  const [{ total }] = await getDb().select({ total: count() }).from(applications);

  return (
    <section>
      <h1 className="text-2xl font-bold">내 이직 활동</h1>
      <p className="mt-2 text-zinc-500">등록된 지원 {total}건</p>
    </section>
  );
}
