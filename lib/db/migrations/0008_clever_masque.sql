CREATE TABLE "ContextFolder" (
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "StudyContext" (
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"folderId" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "contextFolderId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "studyContextId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "studyMode" varchar;--> statement-breakpoint
ALTER TABLE "ContextFolder" ADD CONSTRAINT "ContextFolder_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StudyContext" ADD CONSTRAINT "StudyContext_folderId_ContextFolder_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."ContextFolder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StudyContext" ADD CONSTRAINT "StudyContext_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ContextFolder_userId_idx" ON "ContextFolder" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "StudyContext_user_created_idx" ON "StudyContext" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "StudyContext_folder_idx" ON "StudyContext" USING btree ("folderId");--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_contextFolderId_ContextFolder_id_fk" FOREIGN KEY ("contextFolderId") REFERENCES "public"."ContextFolder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_studyContextId_StudyContext_id_fk" FOREIGN KEY ("studyContextId") REFERENCES "public"."StudyContext"("id") ON DELETE set null ON UPDATE no action;