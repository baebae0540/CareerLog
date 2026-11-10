CREATE TYPE "public"."account_kind" AS ENUM('owner', 'demo');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "account_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_one_owner_idx" ON "accounts" USING btree ("kind") WHERE "accounts"."kind" = 'owner';--> statement-breakpoint
-- 손으로 보정: owner 계정을 만들고 기존 지원 건을 모두 owner에 넣은 뒤 NOT NULL을 건다
INSERT INTO "accounts" ("kind") VALUES ('owner');--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "account_id" integer;--> statement-breakpoint
UPDATE "applications" SET "account_id" = (SELECT "id" FROM "accounts" WHERE "kind" = 'owner');--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_account_idx" ON "applications" USING btree ("account_id");
