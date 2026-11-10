import {
  boolean,
  customType,
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

// 바이트 그대로 저장하는 열. drizzle pg-core에 내장이 없어 직접 정의한다.
// neon 드라이버는 Buffer 파라미터를 '\\x..' 16진수로 보내고, 결과는 Buffer로 돌려준다
// (혹시 문자열로 오면 16진수로 해석한다).
const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  fromDriver: (v) => (typeof v === "string" ? Buffer.from(v.replace(/^\\x/, ""), "hex") : v),
});

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

/** 지원 건 사진. 상세 화면에서 올리고, /applications/[id]/images/[imageId]로 내려준다. */
export const applicationImages = pgTable(
  "application_images",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    mime: text("mime").notNull(), // 시그니처로 판별한 형식 (image/png 등)
    data: bytea("data").notNull(),
    size: integer("size").notNull(), // 바이트
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("application_images_application_idx").on(t.applicationId)],
);

export type Application = typeof applications.$inferSelect;
export type StatusChange = typeof statusChanges.$inferSelect;
export type Event = typeof events.$inferSelect;
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type EventKind = (typeof eventKind.enumValues)[number];
