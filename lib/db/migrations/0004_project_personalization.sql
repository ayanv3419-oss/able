ALTER TABLE "Memory" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD COLUMN "profile" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Memory_user_project" ON "Memory" USING btree ("userId","projectId");