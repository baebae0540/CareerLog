DROP INDEX "status_changes_changed_at_idx";--> statement-breakpoint
-- 기존 이력이 있을 수 있으므로: 컬럼 추가 → 기록 시각의 한국 날짜로 채움 → NOT NULL
ALTER TABLE "status_changes" ADD COLUMN "changed_on" date;--> statement-breakpoint
UPDATE "status_changes" SET "changed_on" = ("changed_at" AT TIME ZONE 'Asia/Seoul')::date WHERE "changed_on" IS NULL;--> statement-breakpoint
ALTER TABLE "status_changes" ALTER COLUMN "changed_on" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "status_changes_changed_on_idx" ON "status_changes" USING btree ("changed_on");
