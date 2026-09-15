CREATE TYPE "public"."api_key_provider" AS ENUM('groq', 'gemini');--> statement-breakpoint
CREATE TABLE "ApiKey" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"encrypted" text NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(60),
	"lastFailureAt" timestamp,
	"lastFailureKind" varchar(10),
	"preview" varchar(32) NOT NULL,
	"provider" "api_key_provider" NOT NULL,
	"status" varchar(8) DEFAULT 'active' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ApiKey_fingerprint_unique" ON "ApiKey" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "ApiKey_provider_status_idx" ON "ApiKey" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey" USING btree ("userId");