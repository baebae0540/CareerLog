"use client";

// 자유 입력 + 제안 목록 (지원 경로 등). 브라우저 기본 datalist 대신 화면 디자인에 맞춘 목록.
import { useId, useState } from "react";
import { inputClass, popoverClass } from "./ui";

type Props = {
  id: string;
  name: string;
  defaultValue?: string;
  suggestions: string[];
  placeholder?: string;
  maxLength?: number;
  invalid?: boolean;
};

export function SuggestInput({ id, name, defaultValue = "", suggestions, placeholder, maxLength, invalid }: Props) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const query = value.trim().toLowerCase();
  const items = suggestions.filter((s) => s.toLowerCase().includes(query) && s !== value);
  const show = open && items.length > 0;

  function pick(s: string) {
    setValue(s);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault(); // 폼 전송 대신 선택
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputClass}
      />
      {show && (
        <ul id={listId} role="listbox" className={`${popoverClass} absolute inset-x-0 top-full mt-1 max-h-60 overflow-auto`}>
          {items.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // blur보다 먼저 선택되도록 mousedown 사용
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex h-9 cursor-pointer items-center rounded-md px-3 text-zinc-700 dark:text-zinc-200 ${
                i === active ? "bg-zinc-100 dark:bg-zinc-800" : ""
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
