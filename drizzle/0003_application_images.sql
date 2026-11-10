CREATE TABLE "application_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_images" ADD CONSTRAINT "application_images_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_images_application_idx" ON "application_images" USING btree ("application_id");