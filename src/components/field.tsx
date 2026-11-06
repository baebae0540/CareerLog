// 폼 한 칸: 라벨 → 입력 → 안내/오류 한 줄.
// 안내/오류 줄은 비어 있어도 높이를 차지해서, 나란히 놓인 칸끼리 줄이 어긋나지 않는다.

export function Field({
  htmlFor,
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      <p className={`min-h-4 text-xs leading-4 ${error ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

/** 카드 안의 구역 (제목 + 내용) */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      {children}
    </section>
  );
}
