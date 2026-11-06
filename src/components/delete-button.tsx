"use client";

import { useFormStatus } from "react-dom";
import { dangerButtonClass } from "./ui";

/** 삭제 전에 한 번 더 묻는 버튼. 서버 액션은 바깥 form에서 받는다. */
export function DeleteForm({ action, confirmMessage }: { action: () => Promise<void>; confirmMessage: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={dangerButtonClass}>
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
