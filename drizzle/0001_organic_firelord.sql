CREATE TYPE "public"."batch_job_status" AS ENUM('queued', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "batch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"glossary_id" uuid,
	"total_files" integer DEFAULT 0 NOT NULL,
	"completed_files" integer DEFAULT 0 NOT NULL,
	"failed_files" integer DEFAULT 0 NOT NULL,
	"status" "batch_job_status" DEFAULT 'queued' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "batch_job_id" uuid;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "source_file_format" varchar(10);--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "output_file_format" varchar(10);--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "deepl_document_id" varchar(255);--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "deepl_document_key" varchar(255);--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "billed_characters" integer;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_glossary_id_glossaries_id_fk" FOREIGN KEY ("glossary_id") REFERENCES "public"."glossaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_batch_job_id_batch_jobs_id_fk" FOREIGN KEY ("batch_job_id") REFERENCES "public"."batch_jobs"("id") ON DELETE no action ON UPDATE no action;