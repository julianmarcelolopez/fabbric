CREATE TYPE "public"."stock_channel" AS ENUM('online', 'local');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('entrada', 'venta', 'ajuste', 'sync');--> statement-breakpoint
CREATE TABLE "catalog_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"store_name" text NOT NULL,
	"logo_url" text,
	"accent_color" text DEFAULT '#111827' NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"business_description" text,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_configs_org_id_unique" UNIQUE("org_id"),
	CONSTRAINT "catalog_configs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"channel" "stock_channel" NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"delta" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_configs" ADD CONSTRAINT "catalog_configs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;