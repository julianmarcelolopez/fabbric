ALTER TYPE "public"."order_status" ADD VALUE 'partial' BEFORE 'paid';--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "google_sub" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "balance_due_date" date;