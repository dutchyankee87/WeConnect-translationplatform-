import {
  pgTable,
  text,
  timestamp,
  integer,
  json,
  varchar,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "creator",
  "translator",
  "reviewer",
  "approver",
  "admin",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const batchJobStatusEnum = pgEnum("batch_job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "draft",
  "in_review", 
  "changes_requested",
  "approved",
]);

export const glossaryStatusEnum = pgEnum("glossary_status", [
  "ready",
  "syncing",
  "error",
]);

export const correctionTypeEnum = pgEnum("correction_type", [
  "terminology", 
  "phrasing"
]);

// User table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("creator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Batch Job table
export const batchJobs = pgTable("batch_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  glossaryId: uuid("glossary_id").references(() => glossaries.id),
  totalFiles: integer("total_files").notNull().default(0),
  completedFiles: integer("completed_files").notNull().default(0),
  failedFiles: integer("failed_files").notNull().default(0),
  status: batchJobStatusEnum("status").notNull().default("queued"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Translation Job table
export const translationJobs = pgTable("translation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  batchJobId: uuid("batch_job_id").references(() => batchJobs.id),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  // Multi-language support
  targetLanguages: json("target_languages").$type<string[]>(),
  isMultiLanguage: varchar("is_multi_language", { length: 5 }).default("false"),
  parentJobId: uuid("parent_job_id").references(() => translationJobs.id),
  sourceFileName: varchar("source_file_name", { length: 255 }).notNull(),
  sourceFilePath: text("source_file_path").notNull(),
  outputFileName: varchar("output_file_name", { length: 255 }),
  outputFilePath: text("output_file_path"),
  sourceFileFormat: varchar("source_file_format", { length: 10 }),
  outputFileFormat: varchar("output_file_format", { length: 10 }),
  glossaryId: uuid("glossary_id").references(() => glossaries.id),
  deeplDocumentId: varchar("deepl_document_id", { length: 255 }),
  deeplDocumentKey: varchar("deepl_document_key", { length: 255 }),
  billedCharacters: integer("billed_characters"),
  appliedLearningCorrections: integer("applied_learning_corrections").default(0),
  learningStatsUsed: json("learning_stats_used").$type<{
    termCount: number;
    segmentCount: number;
    totalUsage: number;
  }>(),
  status: jobStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Glossary table
export const glossaries = pgTable("glossaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  entriesCount: integer("entries_count").notNull().default(0),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  status: glossaryStatusEnum("status").notNull().default("ready"),
  deeplGlossaryId: varchar("deepl_glossary_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Glossary Entry table
export const glossaryEntries = pgTable("glossary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  glossaryId: uuid("glossary_id")
    .references(() => glossaries.id)
    .notNull(),
  sourceTerm: varchar("source_term", { length: 255 }).notNull(),
  targetTerm: varchar("target_term", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Translation Memory table
export const translationMemory = pgTable("translation_memory", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => translationJobs.id)
    .notNull(),
  sourceSegment: text("source_segment").notNull(),
  targetSegment: text("target_segment").notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Translation Task table
export const translationTasks = pgTable("translation_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => translationJobs.id)
    .notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  status: taskStatusEnum("status").notNull().default("draft"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Translation QA Result table
export const translationQAResults = pgTable("translation_qa_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => translationJobs.id)
    .notNull(),
  glossaryWarnings: json("glossary_warnings").$type<Array<{
    segment: string;
    sourceTerm: string;
    targetTerm: string;
    message: string;
  }>>(),
  numberWarnings: json("number_warnings").$type<Array<{
    segment: string;
    sourceNumbers: string[];
    targetNumbers: string[];
    message: string;
  }>>(),
  qualityScore: integer("quality_score").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Event table
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => translationTasks.id),
  jobId: uuid("job_id").references(() => translationJobs.id),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Task Segments table
export const taskSegments = pgTable("task_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .references(() => translationTasks.id)
    .notNull(),
  segmentIndex: integer("segment_index").notNull(),
  sourceText: text("source_text").notNull(),
  targetText: text("target_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Learning system tables for future implementation
export const translationCorrections = pgTable("translation_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => translationJobs.id)
    .notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  countryCode: varchar("country_code", { length: 10 }).notNull(),
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text").notNull(),
  correctionType: correctionTypeEnum("correction_type").notNull(),
  submittedBy: varchar("submitted_by", { length: 255 }).notNull(),
  isApproved: varchar("is_approved", { length: 5 }).default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learnedSegments = pgTable("learned_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceText: text("source_text").notNull(),
  targetText: text("target_text").notNull(),
  improvedText: text("improved_text").notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  usageCount: integer("usage_count").notNull().default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const learnedTerms = pgTable("learned_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceTerm: text("source_term").notNull(),
  targetTerm: text("target_term").notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  frequency: integer("frequency").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  translationJobs: many(translationJobs),
  batchJobs: many(batchJobs),
  assignedTasks: many(translationTasks),
  auditEvents: many(auditEvents),
}));

export const batchJobsRelations = relations(
  batchJobs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [batchJobs.userId],
      references: [users.id],
    }),
    glossary: one(glossaries, {
      fields: [batchJobs.glossaryId],
      references: [glossaries.id],
    }),
    translationJobs: many(translationJobs),
  })
);

export const translationJobsRelations = relations(
  translationJobs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [translationJobs.userId],
      references: [users.id],
    }),
    batchJob: one(batchJobs, {
      fields: [translationJobs.batchJobId],
      references: [batchJobs.id],
    }),
    glossary: one(glossaries, {
      fields: [translationJobs.glossaryId],
      references: [glossaries.id],
    }),
    translationMemory: many(translationMemory),
    translationTasks: many(translationTasks),
    qaResults: many(translationQAResults),
    auditEvents: many(auditEvents),
  })
);

export const glossariesRelations = relations(glossaries, ({ many }) => ({
  entries: many(glossaryEntries),
  translationJobs: many(translationJobs),
  batchJobs: many(batchJobs),
}));

export const glossaryEntriesRelations = relations(
  glossaryEntries,
  ({ one }) => ({
    glossary: one(glossaries, {
      fields: [glossaryEntries.glossaryId],
      references: [glossaries.id],
    }),
  })
);

export const translationMemoryRelations = relations(
  translationMemory,
  ({ one }) => ({
    job: one(translationJobs, {
      fields: [translationMemory.jobId],
      references: [translationJobs.id],
    }),
  })
);

export const translationTasksRelations = relations(
  translationTasks,
  ({ one, many }) => ({
    job: one(translationJobs, {
      fields: [translationTasks.jobId],
      references: [translationJobs.id],
    }),
    assignedUser: one(users, {
      fields: [translationTasks.assignedTo],
      references: [users.id],
    }),
    segments: many(taskSegments),
    auditEvents: many(auditEvents),
  })
);

export const translationQAResultsRelations = relations(
  translationQAResults,
  ({ one }) => ({
    job: one(translationJobs, {
      fields: [translationQAResults.jobId],
      references: [translationJobs.id],
    }),
  })
);

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  task: one(translationTasks, {
    fields: [auditEvents.taskId],
    references: [translationTasks.id],
  }),
  job: one(translationJobs, {
    fields: [auditEvents.jobId],
    references: [translationJobs.id],
  }),
  user: one(users, {
    fields: [auditEvents.userId],
    references: [users.id],
  }),
}));

export const taskSegmentsRelations = relations(taskSegments, ({ one }) => ({
  task: one(translationTasks, {
    fields: [taskSegments.taskId],
    references: [translationTasks.id],
  }),
}));