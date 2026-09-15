import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { UserProfile } from "../personalization";

export const planIdEnum = pgEnum("plan_id", ["basic", "plus", "pro"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "approved",
  "rejected",
  "refunded",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "superseded",
  "revoked",
  "refunded",
]);

export const refundRequestStatusEnum = pgEnum("refund_request_status", [
  "open",
  "refunded",
  "declined",
]);

export const usageKindEnum = pgEnum("usage_kind", [
  "chat",
  "transcription",
  "title",
]);

export const apiKeyProviderEnum = pgEnum("api_key_provider", [
  "groq",
  "gemini",
]);

export const user = pgTable(
  "User",
  {
    /** Set when the owner rejects a payment request; cleared by Unblock. */
    blockedAt: timestamp("blockedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    image: text("image"),
    isAnonymous: boolean("isAnonymous").notNull().default(false),
    name: text("name"),
    password: varchar("password", { length: 64 }),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    lowerEmailUnique: uniqueIndex("User_lower_email_unique").on(
      sql`lower(${table.email})`
    ),
  })
);

export type User = InferSelectModel<typeof user>;

export const apiKey = pgTable(
  "ApiKey",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    encrypted: text("encrypted").notNull(),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    label: varchar("label", { length: 60 }),
    lastFailureAt: timestamp("lastFailureAt"),
    lastFailureKind: varchar("lastFailureKind", {
      enum: ["invalid", "throttled"],
      length: 10,
    }),
    preview: varchar("preview", { length: 32 }).notNull(),
    provider: apiKeyProviderEnum("provider").notNull(),
    status: varchar("status", {
      enum: ["active", "disabled"],
      length: 8,
    })
      .notNull()
      .default("active"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("ApiKey_fingerprint_unique").on(table.fingerprint),
    index("ApiKey_provider_status_idx").on(table.provider, table.status),
    index("ApiKey_userId_idx").on(table.userId),
  ]
);

export type ApiKey = InferSelectModel<typeof apiKey>;
export type NewApiKey = InferInsertModel<typeof apiKey>;

export const contextFolder = pgTable(
  "ContextFolder",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => [index("ContextFolder_userId_idx").on(table.userId)]
);

export type ContextFolder = InferSelectModel<typeof contextFolder>;

/** Pasted study material. Its text becomes immutable ten minutes after save. */
export const studyContext = pgTable(
  "StudyContext",
  {
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    folderId: uuid("folderId")
      .notNull()
      .references(() => contextFolder.id),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: varchar("title", { length: 120 }).notNull(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("StudyContext_user_created_idx").on(table.userId, table.createdAt),
    index("StudyContext_folder_idx").on(table.folderId),
  ]
);

export type StudyContext = InferSelectModel<typeof studyContext>;

export const project = pgTable("Project", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  instructions: text("instructions"),
  name: varchar("name", { length: 60 }).notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Project = InferSelectModel<typeof project>;

export const chat = pgTable("Chat", {
  contextFolderId: uuid("contextFolderId").references(() => contextFolder.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId").references(() => project.id, {
    onDelete: "set null",
  }),
  studyContextId: uuid("studyContextId").references(() => studyContext.id, {
    onDelete: "set null",
  }),
  studyMode: varchar("studyMode", {
    enum: ["lesson", "explain", "summary", "quiz", "important"],
  }),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  attachments: json("attachments").notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    isUpvoted: boolean("isUpvoted").notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    content: text("content"),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("text", { enum: ["text", "code", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    createdAt: timestamp("createdAt").notNull(),
    description: text("description"),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    documentId: uuid("documentId").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    isResolved: boolean("isResolved").notNull().default(false),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const payment = pgTable(
  "Payment",
  {
    amountInr: integer("amountInr").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    planId: planIdEnum("planId").notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedBy: text("reviewedBy"),
    reviewNote: text("reviewNote"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    studentNote: text("studentNote"),
    userId: uuid("userId").references(() => user.id, { onDelete: "set null" }),
    /** Only on requests made before the Request button replaced the reference box. */
    utr: varchar("utr", { length: 32 }),
  },
  (table) => [
    uniqueIndex("Payment_unrejected_utr_unique")
      .on(table.utr)
      .where(sql`${table.status} <> 'rejected'`),
    uniqueIndex("Payment_one_pending_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'pending'`),
  ]
);

export type Payment = InferSelectModel<typeof payment>;

export const subscription = pgTable("Subscription", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  endsAt: timestamp("endsAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  paymentId: uuid("paymentId")
    .notNull()
    .unique()
    .references(() => payment.id),
  planId: planIdEnum("planId").notNull(),
  reminderSentAt: timestamp("reminderSentAt"),
  startsAt: timestamp("startsAt").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Subscription = InferSelectModel<typeof subscription>;

export const refundRequest = pgTable("RefundRequest", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  paymentId: uuid("paymentId")
    .notNull()
    .unique()
    .references(() => payment.id),
  reason: text("reason").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: text("resolvedBy"),
  status: refundRequestStatusEnum("status").notNull().default("open"),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type RefundRequest = InferSelectModel<typeof refundRequest>;

export const usageEvent = pgTable(
  "UsageEvent",
  {
    audioSeconds: integer("audioSeconds").notNull().default(0),
    cachedInputTokens: integer("cachedInputTokens").notNull().default(0),
    chatId: uuid("chatId"),
    costMicros: integer("costMicros").notNull().default(0),
    countsTowardLimit: boolean("countsTowardLimit").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    inputTokens: integer("inputTokens").notNull().default(0),
    kind: usageKindEnum("kind").notNull(),
    outputTokens: integer("outputTokens").notNull().default(0),
    planId: planIdEnum("planId"),
    reasoningTokens: integer("reasoningTokens").notNull().default(0),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    webSearches: integer("webSearches").notNull().default(0),
  },
  (table) => [
    index("UsageEvent_userId_createdAt_idx").on(table.userId, table.createdAt),
  ]
);

export type UsageEvent = InferSelectModel<typeof usageEvent>;
export type NewUsageEvent = InferInsertModel<typeof usageEvent>;

export const memory = pgTable(
  "Memory",
  {
    content: varchar("content", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    projectId: uuid("projectId").references(() => project.id, {
      onDelete: "cascade",
    }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    userProject: index("Memory_user_project").on(table.userId, table.projectId),
  })
);

export type Memory = InferSelectModel<typeof memory>;

export const userSettings = pgTable("UserSettings", {
  aboutMe: varchar("aboutMe", { length: 1500 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  memoryEnabled: boolean("memoryEnabled").notNull().default(true),
  profile: json("profile").$type<Partial<UserProfile>>().notNull().default({}),
  responseStyle: varchar("responseStyle", { length: 1500 }),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id),
});

export type UserSettings = InferSelectModel<typeof userSettings>;

export const attachment = pgTable("Attachment", {
  charCount: integer("charCount").notNull(),
  chatId: uuid("chatId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  mediaType: text("mediaType").notNull(),
  name: text("name").notNull(),
  text: text("text").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Attachment = InferSelectModel<typeof attachment>;

/** Reservations make expensive feature limits safe across server instances. */
export const featureRun = pgTable(
  "FeatureRun",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().defaultRandom(),
    kind: varchar("kind", { enum: ["pdf", "research"] }).notNull(),
    status: varchar("status", { enum: ["pending", "completed", "failed"] })
      .notNull()
      .default("pending"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("FeatureRun_user_kind_created_idx").on(
      table.userId,
      table.kind,
      table.createdAt
    ),
  ]
);
