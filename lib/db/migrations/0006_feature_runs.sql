CREATE TABLE "FeatureRun" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FeatureRun" ADD CONSTRAINT "FeatureRun_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "FeatureRun_user_kind_created_idx" ON "FeatureRun" USING btree ("userId","kind","createdAt");