import type { ApplicationStatus } from "@/db/schema";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/labels";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
