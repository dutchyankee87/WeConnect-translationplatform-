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

// Translation Job table
export const translationJobs = pgTable("translation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  sourceLanguage: varchar("source_language", { length: 10 }).notNull(),
  targetLanguage: varchar("target_language", { length: 10 }).notNull(),
  sourceFileName: varchar("source_file_name", { length: 255 }).notNull(),
  sourceFilePath: text("source_file_path").notNull(),
  outputFileName: varchar("output_file_name", { length: 255 }),
  outputFilePath: text("output_file_path"),
  glossaryId: uuid("glossary_id").references(() => glossaries.id),
  status: jobStatusEnum("status").notNull().default("pending"),
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
  metadata: json("metadata").$type<Record<string, any>>(),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  translationJobs: many(translationJobs),
  assignedTasks: many(translationTasks),
  auditEvents: many(auditEvents),
}));

export const translationJobsRelations = relations(
  translationJobs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [translationJobs.userId],
      references: [users.id],
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