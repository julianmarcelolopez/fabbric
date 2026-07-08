CREATE TYPE "public"."home_section_ref_type" AS ENUM('category', 'collection');--> statement-breakpoint
CREATE TABLE "home_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"ref_type" "home_section_ref_type" NOT NULL,
	"ref_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_sections_org_ref_unique" UNIQUE("org_id","ref_type","ref_id")
);
--> statement-breakpoint
ALTER TABLE "home_sections" ADD CONSTRAINT "home_sections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;