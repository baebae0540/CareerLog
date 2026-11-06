"use client";

import { useState } from "react";

/**
 * 서버가 돌려준 필드별 오류를, 그 칸에 입력을 시작하면 지운다.
 * 다시 제출해서 새 오류 객체가 오면 처음부터 다시 보여준다.
 * - onInput: 감싸는 요소에 달면 안쪽 입력칸(name 기준)의 입력을 잡는다
 * - clear(name): 선택 상자·날짜처럼 input 이벤트가 없는 칸에서 직접 호출
 */
export function useFieldErrors<K extends string>(source: Partial<Record<K, string>> | undefined) {
  const [tracked, setTracked] = useState({ source, cleared: new Set<string>() });

  // 새 제출 결과가 오면 지운 목록을 초기화 (렌더 중 상태 조정 패턴)
  let cleared = tracked.cleared;
  if (tracked.source !== source) {
    cleared = new Set();
    setTracked({ source, cleared });
  }

  const errors = Object.fromEntries(
    Object.entries(source ?? {}).filter(([k]) => !cleared.has(k)),
  ) as Partial<Record<K, string>>;

  function clear(name: string) {
    if (!(name in errors)) return;
    setTracked((t) => ({ ...t, cleared: new Set(t.cleared).add(name) }));
  }

  function onInput(e: React.FormEvent) {
    const name = (e.target as HTMLInputElement).name;
    if (name) clear(name);
  }

  return { errors, clear, onInput };
}
