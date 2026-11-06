"use client";

// 화면 디자인과 맞춘 날짜 선택. Radix Popover + react-day-picker.
// 값은 YYYY-MM-DD 문자열로 주고받고, name을 주면 숨은 input으로 폼에 전송한다.
// 날짜만 다루므로 Date는 브라우저 로컬 자정으로 만들고 연·월·일만 읽는다.
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { formatYmd } from "@/lib/dates";
import { popoverClass, triggerClass } from "./ui";

type Props = {
  id?: string;
  name?: string;
  /** 제어 모드 값 (YYYY-MM-DD 또는 "") */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** 한국 기준 오늘 (서버에서 계산) */
  today: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** 비우기 버튼을 보여줄지 */
  clearable?: boolean;
};

const toDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toYmd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function DatePicker({
  id,
  name,
  value: controlled,
  defaultValue = "",
  onChange,
  today,
  placeholder = "날짜 선택",
  disabled,
  invalid,
  clearable,
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const value = controlled ?? inner;
  const selected = value ? toDate(value) : undefined;

  function set(next: string) {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        data-placeholder={value ? undefined : ""}
        className={triggerClass}
      >
        <span className="truncate">{value ? formatYmd(value) : placeholder}</span>
        <CalendarIcon />
      </Popover.Trigger>
      {/* 비활성이면 전송하지 않는다 (관심 상태의 지원일 등) */}
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className={`${popoverClass} p-3`}>
          <DayPicker
            mode="single"
            locale={ko}
            weekStartsOn={1} // 주간 모니터링과 같은 월요일 시작
            today={toDate(today)}
            selected={selected}
            defaultMonth={selected ?? toDate(today)}
            onSelect={(d) => d && set(toYmd(d))}
            showOutsideDays
            autoFocus
          />
          <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <button type="button" onClick={() => set(today)} className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950">
              오늘
            </button>
            {clearable && (
              <button type="button" onClick={() => set("")} className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                비우기
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-zinc-400">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
