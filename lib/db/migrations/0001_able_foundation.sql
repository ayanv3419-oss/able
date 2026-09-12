CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."plan_id" AS ENUM('basic', 'plus', 'pro');--> statement-breakpoint
CREATE TYPE "public"."refund_request_status" AS ENUM('open', 'refunded', 'declined');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'superseded', 'revoked', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('chat', 'transcription', 'title');--> statement-breakpoint
CREATE TABLE "Attachment" (
	"charCount" integer NOT NULL,
	"chatId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mediaType" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Memory" (
	"content" varchar(500) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Payment" (
	"amountInr" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planId" "plan_id" NOT NULL,
	"reviewNote" text,
	"reviewedAt" timestamp,
	"reviewedBy" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"studentNote" text,
	"userId" uuid,
	"utr" varchar(32) NOT NULL,
	CONSTRAINT "Payment_utr_unique" UNIQUE("utr")
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructions" text,
	"name" varchar(60) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RefundRequest" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"reason" text NOT NULL,
	"resolvedAt" timestamp,
	"resolvedBy" text,
	"status" "refund_request_status" DEFAULT 'open' NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "RefundRequest_paymentId_unique" UNIQUE("paymentId")
);
--> statement-breakpoint
CREATE TABLE "Subscription" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"endsAt" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentId" uuid NOT NULL,
	"planId" "plan_id" NOT NULL,
	"reminderSentAt" timestamp,
	"startsAt" timestamp NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "Subscription_paymentId_unique" UNIQUE("paymentId")
);
--> statement-breakpoint
CREATE TABLE "UsageEvent" (
	"audioSeconds" integer DEFAULT 0 NOT NULL,
	"cachedInputTokens" integer DEFAULT 0 NOT NULL,
	"chatId" uuid,
	"costMicros" integer DEFAULT 0 NOT NULL,
	"countsTowardLimit" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inputTokens" integer DEFAULT 0 NOT NULL,
	"kind" "usage_kind" NOT NULL,
	"outputTokens" integer DEFAULT 0 NOT NULL,
	"planId" "plan_id",
	"reasoningTokens" integer DEFAULT 0 NOT NULL,
	"userId" uuid NOT NULL,
	"webSearches" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSettings" (
	"aboutMe" varchar(1500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"memoryEnabled" boolean DEFAULT true NOT NULL,
	"responseStyle" varchar(1500),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentId_Payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentId_Payment_id_fk" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "UsageEvent_userId_createdAt_idx" ON "UsageEvent" USING btree ("userId","createdAt");--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE set null ON UPDATE no action;