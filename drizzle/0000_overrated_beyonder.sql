CREATE TYPE "public"."application_status" AS ENUM('interested', 'applied', 'document_passed', 'interview', 'final', 'offer', 'rejected', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('interview', 'assignment', 'deadline', 'other');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"position" text NOT NULL,
	"job_url" text,
	"source" text,
	"status" "application_status" DEFAULT 'interested' NOT NULL,
	"applied_at" date,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"kind" "event_kind" DEFAULT 'other' NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"memo" text,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"note" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_applied_at_idx" ON "applications" USING btree ("applied_at");--> statement-breakpoint
CREATE INDEX "events_application_idx" ON "events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "status_changes_application_idx" ON "status_changes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "status_changes_changed_at_idx" ON "status_changes" USING btree ("changed_at");