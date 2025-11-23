CREATE TYPE "public"."glossary_status" AS ENUM('ready', 'syncing', 'error');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('draft', 'in_review', 'changes_requested', 'approved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('creator', 'translator', 'reviewer', 'approver', 'admin');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"job_id" uuid,
	"user_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"entries_count" integer DEFAULT 0 NOT NULL,
	"source_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"status" "glossary_status" DEFAULT 'ready' NOT NULL,
	"deepl_glossary_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glossary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"glossary_id" uuid NOT NULL,
	"source_term" varchar(255) NOT NULL,
	"target_term" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"segment_index" integer NOT NULL,
	"source_text" text NOT NULL,
	"target_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"source_file_name" varchar(255) NOT NULL,
	"source_file_path" text NOT NULL,
	"output_file_name" varchar(255),
	"output_file_path" text,
	"glossary_id" uuid,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_segment" text NOT NULL,
	"target_segment" text NOT NULL,
	"source_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_qa_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"glossary_warnings" json,
	"number_warnings" json,
	"quality_score" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_language" varchar(10) NOT NULL,
	"target_language" varchar(10) NOT NULL,
	"status" "task_status" DEFAULT 'draft' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'creator' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_task_id_translation_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."translation_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_job_id_translation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."translation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_glossary_id_glossaries_id_fk" FOREIGN KEY ("glossary_id") REFERENCES "public"."glossaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_segments" ADD CONSTRAINT "task_segments_task_id_translation_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."translation_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_glossary_id_glossaries_id_fk" FOREIGN KEY ("glossary_id") REFERENCES "public"."glossaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_memory" ADD CONSTRAINT "translation_memory_job_id_translation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."translation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_qa_results" ADD CONSTRAINT "translation_qa_results_job_id_translation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."translation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_job_id_translation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."translation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_tasks" ADD CONSTRAINT "translation_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;