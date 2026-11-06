import type { ApplicationStatus, EventKind } from "@/db/schema";

/** 상태 표시 순서 (진행 순 → 결과) */
export const STATUS_ORDER: ApplicationStatus[] = [
  "interested",
  "applied",
  "document_passed",
  "interview",
  "final",
  "offer",
  "rejected",
  "on_hold",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  interested: "관심",
  applied: "지원",
  document_passed: "서류 통과",
  interview: "면접",
  final: "최종",
  offer: "합격",
  rejected: "불합격",
  on_hold: "보류",
};

// 색 규칙: 진행 단계는 파랑 순차 램프(진할수록 앞으로 나아감), 결과는 초록·빨강, 관심·보류는 회색
export const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  interested: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  applied: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  document_passed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  interview: "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100",
  final: "bg-blue-600 text-white dark:bg-blue-500",
  offer: "bg-green-600 text-white dark:bg-green-500",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  on_hold: "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400",
};

/** 일정 종류 표시 순서 */
export const EVENT_KIND_ORDER: EventKind[] = ["interview", "assignment", "deadline", "other"];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  interview: "면접",
  assignment: "과제",
  deadline: "마감",
  other: "기타",
};

// 일정 종류 색: 면접 파랑, 과제 보라, 마감 주황, 기타 회색
export const EVENT_KIND_BADGE_CLASS: Record<EventKind, string> = {
  interview: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  assignment: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  deadline: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
