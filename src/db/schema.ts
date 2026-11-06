import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// 상태 값. 화면 표시용 한국어 이름은 src/lib/labels.ts
export const applicationStatus = pgEnum("application_status", [
  "interested", // 관심
  "applied", // 지원
  "document_passed", // 서류 통과
  "interview", // 면접
  "final", // 최종
  "offer", // 합격
  "rejected", // 불합격
  "on_hold", // 보류 (내가 중단)
]);

export const eventKind = pgEnum("event_kind", [
  "interview", // 면접
  "assignment", // 과제
  "deadline", // 마감
  "other", // 기타
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** 지원 건 */
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    company: text("company").notNull(),
    position: text("position").notNull(),
    jobUrl: text("job_url"),
    source: text("source"), // 지원 경로 (원티드, 지인 추천 등)
    status: applicationStatus("status").notNull().default("interested"),
    appliedAt: date("applied_at", { mode: "string" }), // YYYY-MM-DD (한국 날짜)
    memo: text("memo"),
    ...timestamps,
  },
  (t) => [index("applications_applied_at_idx").on(t.appliedAt)],
);

/** 상태 변경 이력. changeStatus 액션에서만 기록한다. */
export const statusChanges = pgTable(
  "status_changes",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus("from_status"), // 최초 등록이면 null
    toStatus: applicationStatus("to_status").notNull(),
    note: text("note"),
    // 상태가 바뀐 날 (한국 날짜, 사용자가 고른다). 주간 모니터링의 기준.
    changedOn: date("changed_on", { mode: "string" }).notNull(),
    // 실제로 기록한 시각 (같은 날 여러 번 바꿨을 때 순서용)
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("status_changes_application_idx").on(t.applicationId),
    index("status_changes_changed_on_idx").on(t.changedOn),
  ],
);

/** 일정 (면접·과제·마감 등). 주간 캘린더의 주 재료. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: eventKind("kind").notNull().default("other"),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    // 시간 미정 (날짜만 정해짐). 이때 starts_at은 그날 00:00 한국 시간
    allDay: boolean("all_day").notNull().default(false),
    memo: text("memo"),
    done: boolean("done").notNull().default(false),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("events_application_idx").on(t.applicationId),
    index("events_starts_at_idx").on(t.startsAt),
  ],
);

export type Application = typeof applications.$inferSelect;
export type StatusChange = typeof statusChanges.$inferSelect;
export type Event = typeof events.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type EventKind = (typeof eventKind.enumValues)[number];
