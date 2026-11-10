import { notFound } from "next/navigation";
import { getApplication } from "@/db/queries";
import { ApplicationForm } from "@/components/application-form";
import { StatusBadge } from "@/components/status-badge";
import { parseId } from "@/lib/application-input";
import { todayInSeoul } from "@/lib/dates";
import { requireLogin } from "@/lib/session";
import { updateApplication } from "../../actions";

export default async function EditApplicationPage(props: PageProps<"/applications/[id]/edit">) {
  const { accountId } = await requireLogin();
  const id = parseId((await props.params).id);
  if (!id) notFound();
  const app = await getApplication(accountId, id);
  if (!app) notFound();

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">지원 정보 수정</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
          현재 상태 <StatusBadge status={app.status} />
          <span>· 상태는 상세 화면에서 바꿉니다</span>
        </p>
      </div>
      <ApplicationForm
        action={updateApplication.bind(null, app.id)}
        initial={{
          company: app.company,
          position: app.position,
          jobUrl: app.jobUrl ?? "",
          source: app.source ?? "",
          appliedAt: app.appliedAt ?? "",
          memo: app.memo ?? "",
        }}
        withStatus={false}
        currentStatus={app.status}
        today={todayInSeoul()}
        submitLabel="저장"
        cancelHref={`/applications/${app.id}`}
      />
    </section>
  );
}
