// 지원 목록 CSV 만들기 (순수 함수, 테스트 있음). 엑셀에서 한글이 깨지지 않게 BOM + CRLF.
import type { ApplicationStatus } from "@/db/schema";
import { seoulParts } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/labels";

/** 값 하나를 CSV 칸으로. 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다. */
export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  // 엑셀이 수식으로 실행하지 않게 앞에 '를 붙인다 ("- 항목" 같은 목록 기호는 그대로)
  if (/^[=+@\t\r]/.test(v) || /^-[^\s]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

export function toCsv(rows: (string | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export type CsvApplication = {
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  source: string | null;
  jobUrl: string | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const APPLICATION_CSV_HEADER = ["회사", "포지션", "상태", "지원일", "지원 경로", "공고 링크", "메모", "등록일", "수정일"];

export function applicationsCsv(apps: CsvApplication[]): string {
  return toCsv([
    APPLICATION_CSV_HEADER,
    ...apps.map((a) => [
      a.company,
      a.position,
      STATUS_LABEL[a.status],
      a.status === "interested" ? "" : a.appliedAt,
      a.source,
      a.jobUrl,
      a.memo,
      seoulParts(a.createdAt).ymd,
      seoulParts(a.updatedAt).ymd,
    ]),
  ]);
}
