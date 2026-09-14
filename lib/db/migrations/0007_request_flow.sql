ALTER TABLE "Payment" ALTER COLUMN "utr" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "blockedAt" timestamp;