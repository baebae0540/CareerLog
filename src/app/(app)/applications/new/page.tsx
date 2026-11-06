import { ApplicationForm } from "@/components/application-form";
import { todayInSeoul } from "@/lib/dates";
import { requireLogin } from "@/lib/session";
import { createApplication } from "../actions";

export default async function NewApplicationPage() {
  await requireLogin();

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">새 지원 등록</h1>
      <ApplicationForm
        action={createApplication}
        initial={{ status: "applied", appliedAt: todayInSeoul() }}
        withStatus
        submitLabel="등록"
        cancelHref="/"
      />
    </section>
  );
}
