"use client";

// 화면 디자인과 맞춘 선택 상자. Radix Select 기반 (키보드·스크린 리더 지원).
// name을 주면 폼 전송용 숨은 <select>를 Radix가 함께 그린다.
import * as RadixSelect from "@radix-ui/react-select";
import { popoverClass, triggerClass } from "./ui";

export type SelectOption = { value: string; label: string };

type Props = {
  id?: string;
  name?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
};

export function Select({ id, name, options, value, defaultValue, onValueChange, placeholder, disabled, invalid }: Props) {
  return (
    <RadixSelect.Root name={name} value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
      <RadixSelect.Trigger id={id} aria-invalid={invalid || undefined} className={triggerClass}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon className="text-zinc-400">
          <ChevronDown />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={`${popoverClass} max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)`}
        >
          <RadixSelect.Viewport>
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className="relative flex h-9 cursor-pointer items-center rounded-md pr-8 pl-3 text-zinc-700 outline-none select-none data-[highlighted]:bg-zinc-100 data-[state=checked]:font-medium data-[state=checked]:text-blue-600 dark:text-zinc-200 dark:data-[highlighted]:bg-zinc-800 dark:data-[state=checked]:text-blue-400"
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5">
                  <Check />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

export function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
